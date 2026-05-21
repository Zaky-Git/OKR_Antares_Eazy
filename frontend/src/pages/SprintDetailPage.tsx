import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintService } from '../services/sprint.service';
import { periodService } from '../services/period.service';
import { SprintBoard } from '../components/organisms/SprintBoard';
import { SprintSummary } from '../components/organisms/SprintSummary';
import { BacklogPanel } from '../components/organisms/BacklogPanel';
import CompleteSprintModal from '../components/organisms/CompleteSprintModal';
import { DetailPanel } from '../components/organisms/DetailPanel';
import { InitiativePanel } from '../components/organisms/InitiativePanel';
import { SprintPanel } from '../components/organisms/SprintPanel';
import { SprintInitiative, Initiative } from '../types';
import toast from 'react-hot-toast';

export function SprintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sprintId = Number(id);

  const [selectedInitiative, setSelectedInitiative] = useState<SprintInitiative | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);

  const { data: sprintRes, isLoading, isError } = useQuery({
    queryKey: ['sprint', sprintId],
    queryFn: () => sprintService.getById(sprintId),
    enabled: !!sprintId,
  });

  const sprint = sprintRes?.data?.data;

  const { data: periodRes } = useQuery({
    queryKey: ['periods', sprint?.period_id, 'detail'],
    queryFn: () => periodService.getAll(),
    enabled: !!sprint?.period_id,
  });
  const period = periodRes?.data?.data?.find(p => p.id === sprint?.period_id);

  const { data: backlogRes } = useQuery({
    queryKey: ['sprint-backlog', sprintId],
    queryFn: () => sprintService.getSprintBacklog(sprintId),
    enabled: !!sprintId,
  });
  const backlogData: SprintInitiative[] = backlogRes?.data?.data || [];

  const activateMutation = useMutation({
    mutationFn: () => sprintService.activate(sprintId),
    onSuccess: () => {
      toast.success('Sprint berhasil diaktifkan');
      queryClient.invalidateQueries({ queryKey: ['sprint', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal mengaktifkan sprint'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => sprintService.delete(sprintId),
    onSuccess: () => {
      toast.success('Sprint dihapus');
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      navigate('/sprints');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal menghapus sprint'),
  });

  const handleInitiativeClick = (initiative: SprintInitiative) => {
    setSelectedInitiative(initiative);
  };

  const handleOpenChild = (child: Initiative) => {
    // Convert Initiative to SprintInitiative format for the panel
    const asSprintInit: SprintInitiative = {
      id: child.id,
      key_result_id: child.key_result_id,
      sprint_id: child.sprint_id,
      parent_id: child.parent_id,
      parent_title: selectedInitiative?.title || null,
      title: child.title,
      description: child.description || null,
      assignee_id: child.assignee_id || null,
      assignee_name: null,
      progress: child.progress,
      status: child.status,
      due_date: child.due_date,
      objective_title: selectedInitiative?.objective_title || '',
      key_result_title: selectedInitiative?.key_result_title || '',
      created_by: child.created_by,
      has_children: !!(child.children && child.children.length > 0),
    };
    setSelectedInitiative(asSprintInit);
  };

  const handleDrawerClose = () => {
    setSelectedInitiative(null);
  };

  const handleDrawerSaveSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['sprint-initiatives', sprintId] });
    queryClient.invalidateQueries({ queryKey: ['sprint-summary', sprintId] });
    queryClient.invalidateQueries({ queryKey: ['sprint-backlog', sprintId] });
    setSelectedInitiative(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Memuat sprint...</span>
        </div>
      </div>
    );
  }

  if (isError || !sprint) {
    return (
      <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-2xl">
        <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-800 mb-1">Sprint tidak ditemukan</h3>
        <p className="text-sm text-gray-500 mb-4">Sprint mungkin telah dihapus atau Anda tidak memiliki akses.</p>
        <button onClick={() => navigate('/sprints')} className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5">
          ← Kembali ke Sprints
        </button>
      </div>
    );
  }

  const isPlanning = sprint.status === 'PLANNING';
  const isActive = sprint.status === 'ACTIVE';
  const isCompleted = sprint.status === 'COMPLETED';

  // Convert SprintInitiative to Initiative for the panel
  const initiativeForPanel: Initiative | null = selectedInitiative
    ? {
        id: selectedInitiative.id,
        key_result_id: selectedInitiative.key_result_id,
        sprint_id: selectedInitiative.sprint_id,
        parent_id: selectedInitiative.parent_id,
        title: selectedInitiative.title,
        description: selectedInitiative.description,
        assignee_id: selectedInitiative.assignee_id,
        progress: selectedInitiative.progress,
        status: selectedInitiative.status,
        due_date: selectedInitiative.due_date,
        created_by: selectedInitiative.created_by,
        created_at: '',
        updated_at: '',
      }
    : null;

  return (
    <div className="max-w-full space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate('/sprints')} className="hover:text-primary transition-colors flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          Sprints
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-800 font-medium">{sprint.name}</span>
      </div>

      {/* Sprint Header Card */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className={`h-1 ${isActive ? 'bg-emerald-500' : isCompleted ? 'bg-blue-500' : 'bg-gray-300'}`} />
        <div className="p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{sprint.name}</h1>
                <SprintStatusBadge status={sprint.status} />
              </div>
              {sprint.goal && (
                <p className="text-sm text-gray-600 mb-3 max-w-3xl">
                  <span className="font-medium text-gray-700">Goal:</span> {sprint.goal}
                </p>
              )}
              <div className="flex items-center flex-wrap gap-x-3 gap-y-2">
                {/* Date range */}
                <div className="flex items-center gap-2 text-xs">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-gray-700">{formatDate(sprint.start_date)}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  <span className="font-medium text-gray-700">{formatDate(sprint.end_date)}</span>
                </div>

                <span className="text-gray-300">·</span>

                {/* Quarter */}
                {period && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    <span className="font-medium">{period.quarter} {period.year}</span>
                  </span>
                )}

                {/* Timeline status (combines duration + remaining into one clear info) */}
                <span className="text-gray-300">·</span>
                <SprintTimelineInfo startDate={sprint.start_date} endDate={sprint.end_date} status={sprint.status} />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {isPlanning && (
                <>
                  <button
                    onClick={() => activateMutation.mutate()}
                    disabled={activateMutation.isPending}
                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    {activateMutation.isPending ? 'Mengaktifkan...' : 'Activate Sprint'}
                  </button>
                  <button
                    onClick={() => setShowEditDrawer(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Hapus sprint "${sprint.name}"?`)) deleteMutation.mutate();
                    }}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Hapus sprint"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </>
              )}
              {isActive && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Complete Sprint
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sprint Summary */}
      <SprintSummary sprintId={sprintId} />

      {/* Sprint Board + Backlog (shared DndContext) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Sprint Board</h2>
            <p className="text-xs text-gray-500 mt-0.5">Klik card untuk update status atau progress</p>
          </div>
        </div>
        <SprintBoard
          sprintId={sprintId}
          onInitiativeClick={handleInitiativeClick}
          backlogItems={backlogData}
          backlogNode={
            (isPlanning || isActive) ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 mt-6 -mx-5 md:-mx-6 -mb-5 md:-mb-6 border-t rounded-t-none">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Backlog</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Drag ke kolom board di atas untuk assign ke sprint</p>
                  </div>
                </div>
                <BacklogPanel sprintId={sprintId} />
              </div>
            ) : undefined
          }
        />
      </div>

      {/* Review/Retro Notes for COMPLETED sprints */}
      {isCompleted && (sprint.review_note || sprint.retro_note) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Sprint Review</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sprint.review_note && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-700">Review Note</h3>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{sprint.review_note}</p>
              </div>
            )}
            {sprint.retro_note && (
              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700">Retro Note</h3>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{sprint.retro_note}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complete Sprint Modal */}
      {showCompleteModal && (
        <CompleteSprintModal
          open={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          sprintId={sprintId}
          sprintName={sprint.name}
        />
      )}

      {/* Edit Sprint Drawer */}
      <DetailPanel open={showEditDrawer} onClose={() => setShowEditDrawer(false)} title="Detail Sprint">
        {showEditDrawer && period && (
          <SprintPanel sprint={sprint} periodId={sprint.period_id} period={period} onClose={() => setShowEditDrawer(false)} />
        )}
      </DetailPanel>

      {/* Initiative Edit Drawer */}
      <DetailPanel
        open={!!selectedInitiative}
        onClose={handleDrawerClose}
        title="Detail Initiative"
      >
        {selectedInitiative && initiativeForPanel && (
          <InitiativePanel
            initiative={initiativeForPanel}
            keyResultId={selectedInitiative.key_result_id}
            onClose={handleDrawerSaveSuccess}
            onOpenChild={handleOpenChild}
            context={{
              objectiveTitle: selectedInitiative.objective_title,
              keyResultTitle: selectedInitiative.key_result_title,
              parentTitle: selectedInitiative.parent_title || undefined,
            }}
          />
        )}
      </DetailPanel>
    </div>
  );
}

function SprintStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PLANNING: { label: 'Planning', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    ACTIVE: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    COMPLETED: { label: 'Completed', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  };
  const c = config[status] || config.PLANNING;
  return (
    <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${c.className}`}>
      {c.label}
    </span>
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  // Ensure we parse as local date (not UTC) by appending T00:00:00
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SprintTimelineInfo({ startDate, endDate, status }: { startDate: string; endDate: string; status: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Parse as local date to avoid timezone offset issues
  const start = new Date((startDate || '').slice(0, 10) + 'T00:00:00');
  const end = new Date((endDate || '').slice(0, 10) + 'T00:00:00');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const elapsed = Math.round((today.getTime() - start.getTime()) / 86400000) + 1;
  const isActive = status === 'ACTIVE';
  const isPlanning = status === 'PLANNING';
  const isCompleted = status === 'COMPLETED';

  // Planning: just show duration
  if (isPlanning) {
    return (
      <span className="text-xs text-gray-500">
        Durasi <span className="font-medium text-gray-700">{totalDays} hari</span>
      </span>
    );
  }

  // Completed: show "Selesai N hari"
  if (isCompleted) {
    return (
      <span className="text-xs text-gray-500">
        Berlangsung <span className="font-medium text-gray-700">{totalDays} hari</span>
      </span>
    );
  }

  // Active: show day progress with appropriate color
  if (isActive) {
    const isOverdue = elapsed > totalDays;
    const remaining = Math.max(0, totalDays - elapsed);
    const currentDay = Math.min(Math.max(elapsed, 1), totalDays);

    if (isOverdue) {
      const overdueDays = elapsed - totalDays;
      return (
        <span className="px-2 py-0.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full">
          Terlambat {overdueDays} hari
        </span>
      );
    }

    const colorClass = remaining <= 2
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-emerald-700 bg-emerald-50 border-emerald-200';

    return (
      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${colorClass}`}>
        Hari {currentDay}/{totalDays} · Sisa {remaining} hari
      </span>
    );
  }

  return null;
}

