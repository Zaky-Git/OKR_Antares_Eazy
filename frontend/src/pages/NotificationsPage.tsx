import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notification.service';
import { objectiveService } from '../services/objective.service';
import { sprintService } from '../services/sprint.service';
import { periodService } from '../services/period.service';
import { Notification, Objective, Sprint } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/useAuthStore';

const LIMIT = 20;

// ─── helpers ────────────────────────────────────────────────────────────────

function getTypeIcon(type: string) {
  switch (type) {
    case 'DUE_TODAY': return { bg: 'bg-red-100',   text: 'text-red-600',    icon: '🔴' };
    case 'DUE_H1':   return { bg: 'bg-orange-100', text: 'text-orange-600', icon: '🟠' };
    case 'DUE_H3':   return { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: '🟡' };
    case 'OVERDUE':  return { bg: 'bg-red-100',    text: 'text-red-700',    icon: '⚠️' };
    case 'ASSIGN':   return { bg: 'bg-blue-100',   text: 'text-blue-600',   icon: '👤' };
    default:         return { bg: 'bg-gray-100',   text: 'text-gray-600',   icon: '🔔' };
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'DUE_TODAY': return 'Jatuh Tempo Hari Ini';
    case 'DUE_H1':   return 'Jatuh Tempo Besok';
    case 'DUE_H3':   return 'Jatuh Tempo 3 Hari Lagi';
    case 'OVERDUE':  return 'Terlambat';
    case 'ASSIGN':   return 'Ditugaskan';
    default:         return type;
  }
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function navigateTo(notif: Notification, navigate: ReturnType<typeof useNavigate>) {
  if (notif.entity_type === 'INITIATIVE') {
    navigate(`/objectives?highlight=${notif.entity_id}`);
  } else if (notif.entity_type === 'OBJECTIVE') {
    navigate(`/objectives?highlightObj=${notif.entity_id}`);
  } else if (notif.entity_type === 'SPRINT') {
    navigate(`/sprints?highlightSprint=${notif.entity_id}`);
  }
}

// ─── status badges ───────────────────────────────────────────────────────────

function ObjStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PLANNING:  'bg-gray-100 text-gray-600 border-gray-200',
    ON_TRACK:  'bg-blue-50 text-blue-700 border-blue-200',
    AT_RISK:   'bg-amber-50 text-amber-700 border-amber-200',
    OFF_TRACK: 'bg-red-50 text-red-700 border-red-200',
    DONE:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    ARCHIVED:  'bg-gray-50 text-gray-500 border-gray-200',
  };
  const label: Record<string, string> = {
    PLANNING: 'Planning', ON_TRACK: 'On Track', AT_RISK: 'At Risk',
    OFF_TRACK: 'Off Track', DONE: 'Done', ARCHIVED: 'Archived',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${map[status] || map.PLANNING}`}>
      {label[status] || status}
    </span>
  );
}

function SprintStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PLANNING:  'bg-gray-100 text-gray-600 border-gray-200',
    ACTIVE:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  const label: Record<string, string> = { PLANNING: 'Planning', ACTIVE: 'Active', COMPLETED: 'Completed' };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${map[status] || map.PLANNING}`}>
      {label[status] || status}
    </span>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ icon, title, count, onViewAll }: {
  icon: React.ReactNode; title: string; count?: number; onViewAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
        {count !== undefined && (
          <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      <button onClick={onViewAll} className="text-xs font-semibold text-primary hover:underline">
        Lihat Semua →
      </button>
    </div>
  );
}

function ObjectivesSection({ periodId }: { periodId: number | undefined }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['objectives-notif', periodId],
    queryFn: () => objectiveService.getByPeriod(periodId!, { page: 1, limit: 50 }),
    enabled: !!periodId,
  });

  const objectives: Objective[] = (data?.data?.data ?? []).filter(
    (o) => o.created_by === user?.id || o.owner_id === user?.id
  ).slice(0, 5);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
      <SectionHeader
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#194FBC" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}
        title="Objectives Saya (Quarter Ini)"
        count={objectives.length}
        onViewAll={() => navigate('/objectives')}
      />
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : objectives.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-gray-400">Belum ada objective untuk quarter ini.</p>
          <button onClick={() => navigate('/objectives')} className="mt-2 text-xs font-semibold text-primary hover:underline">
            Buat Objective →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {objectives.map((obj) => (
            <button
              key={obj.id}
              onClick={() => navigate(`/objectives?highlightObj=${obj.id}`)}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group"
            >
              <div className="relative w-9 h-9 shrink-0">
                <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none"
                    stroke={obj.progress >= 70 ? '#10B981' : obj.progress >= 40 ? '#194FBC' : '#9CA3AF'}
                    strokeWidth="3"
                    strokeDasharray={`${(obj.progress / 100) * 94.2} 94.2`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-700">
                  {obj.progress.toFixed(0)}%
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-primary transition-colors">
                  {obj.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <ObjStatusBadge status={obj.status} />
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 group-hover:text-primary shrink-0 transition-colors">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SprintsSection({ periodId }: { periodId: number | undefined }) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['sprints-notif', periodId],
    queryFn: () => sprintService.getByPeriod(periodId!),
    enabled: !!periodId,
  });

  const sprints: Sprint[] = (data?.data?.data ?? []).slice(0, 5);
  const activeSprint = sprints.find((s) => s.status === 'ACTIVE');

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
      <SectionHeader
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#194FBC" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>}
        title="Sprint (Quarter Ini)"
        count={sprints.length}
        onViewAll={() => navigate('/sprints')}
      />
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sprints.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-gray-400">Belum ada sprint untuk quarter ini.</p>
          <button onClick={() => navigate('/sprints')} className="mt-2 text-xs font-semibold text-primary hover:underline">
            Buat Sprint →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {activeSprint && (
            <button
              onClick={() => navigate(`/sprints/${activeSprint.id}`)}
              className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl bg-emerald-50/60 border border-emerald-200 hover:bg-emerald-50 transition-all group"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold text-gray-900 truncate">{activeSprint.name}</p>
                  <SprintStatusBadge status={activeSprint.status} />
                </div>
                <p className="text-xs text-gray-500">{formatDate(activeSprint.start_date)} — {formatDate(activeSprint.end_date)}</p>
                {activeSprint.goal && <p className="text-xs text-gray-600 mt-0.5 truncate">{activeSprint.goal}</p>}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 group-hover:text-primary shrink-0 transition-colors">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
          {sprints.filter((s) => s.id !== activeSprint?.id).map((sprint) => (
            <button
              key={sprint.id}
              onClick={() => navigate(`/sprints/${sprint.id}`)}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group"
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${sprint.status === 'COMPLETED' ? 'bg-blue-400' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-gray-700 truncate group-hover:text-primary transition-colors">{sprint.name}</p>
                  <SprintStatusBadge status={sprint.status} />
                </div>
                <p className="text-xs text-gray-400">{formatDate(sprint.start_date)} — {formatDate(sprint.end_date)}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 group-hover:text-primary shrink-0 transition-colors">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: currentPeriodRes } = useQuery({
    queryKey: ['periods', 'current'],
    queryFn: () => periodService.getCurrent(),
  });
  const currentPeriodId = currentPeriodRes?.data?.data?.id;
  const currentPeriod = currentPeriodRes?.data?.data;

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page, LIMIT],
    queryFn: () => notificationService.getAll(page, LIMIT),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast.success('Semua notifikasi ditandai dibaca');
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => notificationService.checkDue(),
    onSuccess: (res) => {
      const count = res.data.data?.created ?? 0;
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['objectives-notif'] });
      queryClient.invalidateQueries({ queryKey: ['sprints-notif'] });
      toast.success(count > 0 ? `${count} notifikasi baru ditemukan` : 'Semua data diperbarui');
    },
  });

  const notifications: Notification[] = data?.data?.data ?? [];
  const meta = data?.data?.meta;
  const totalPages = meta?.total_pages ?? 1;
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const displayed = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  const handleClick = async (notif: Notification) => {
    if (!notif.is_read) await markReadMutation.mutateAsync(notif.id);
    navigateTo(notif, navigate);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifikasi</h1>
          {currentPeriod && (
            <p className="text-sm text-gray-400 mt-0.5">{currentPeriod.quarter} {currentPeriod.year}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshMutation.isPending ? 'animate-spin' : ''}>
              <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {refreshMutation.isPending ? 'Memperbarui...' : 'Refresh'}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Tandai Semua Dibaca
            </button>
          )}
        </div>
      </div>

      {/* Objectives + Sprints sections */}
      <ObjectivesSection periodId={currentPeriodId} />
      <SprintsSection periodId={currentPeriodId} />

      {/* Notifications list — only shown when there are notifications */}
      {(isLoading || displayed.length > 0) && (
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#194FBC" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <h2 className="text-sm font-bold text-gray-800">Notifikasi</h2>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </div>
          {/* All / Unread filter */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                  filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'all' ? 'Semua' : 'Belum Dibaca'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            displayed.map((notif) => {
              const style = getTypeIcon(notif.type);
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all hover:shadow-sm ${
                    notif.is_read
                      ? 'bg-white border-gray-100 hover:border-gray-200'
                      : 'bg-blue-50/60 border-blue-100 hover:border-blue-200'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full ${style.bg} flex items-center justify-center shrink-0 text-base mt-0.5`}>
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mb-1 ${style.bg} ${style.text}`}>
                          {getTypeLabel(notif.type)}
                        </span>
                        <p className={`text-sm leading-snug ${notif.is_read ? 'text-gray-700 font-normal' : 'text-gray-900 font-semibold'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">{relativeTime(notif.created_at)}</span>
                        {!notif.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && filter === 'all' && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Sebelumnya
            </button>
            <span className="text-xs text-gray-500">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Berikutnya →
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
