import { useQuery } from '@tanstack/react-query';
import { dashboardService, ActivityItem } from '../services/dashboard.service';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LogsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: logsRes, isLoading } = useQuery({
    queryKey: ['logs', page],
    queryFn: () => dashboardService.getLogs(page, limit),
  });

  const logs: ActivityItem[] = logsRes?.data?.data || [];
  const meta = logsRes?.data?.meta;
  const totalPages = meta?.total_pages || 1;

  const handleLogClick = (log: ActivityItem) => {
    if (log.initiative_id) {
      navigate(`/objectives?highlight=${log.initiative_id}`);
    } else if (log.objective_id) {
      navigate(`/objectives`);
    }
  };

  return (
    <div className="max-w-full">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-sm text-gray-500 mt-1">Semua log perubahan progress dari tim</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            <span className="text-sm">Memuat logs...</span>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-2xl">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><path d="M12 20V10M18 20V4M6 20v-4" strokeLinecap="round" /></svg>
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Belum ada aktivitas</h3>
          <p className="text-sm text-gray-500">Log akan muncul saat ada perubahan progress initiative.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 px-5 py-4 hover:bg-blue-50/40 cursor-pointer transition-colors"
                onClick={() => handleLogClick(log)}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 shrink-0">
                  <span className="text-sm font-bold text-primary">{log.user_name?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold">{log.user_name}</span>
                    {' '}{log.description || `${log.action.toLowerCase()} ${log.entity_type.toLowerCase()}`}
                  </p>
                  {log.entity_title && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-medium text-primary">{log.entity_title}</span>
                      {log.old_value && log.new_value && (
                        <span className="ml-2 text-gray-400">{log.old_value} → {log.new_value}</span>
                      )}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getActionColor(log.action)}`}>{getActionLabel(log.action)}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{getEntityLabel(log.entity_type)}</span>
                    <span className="text-[11px] text-gray-400">{getRelativeTime(log.created_at)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-gray-300 mt-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                ← Sebelumnya
              </button>
              <span className="text-sm text-gray-500 px-3">
                Halaman {page} dari {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Selanjutnya →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return date.toLocaleDateString('id-ID');
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    CREATE: 'bg-green-50 text-green-700',
    UPDATE: 'bg-blue-50 text-blue-700',
    DELETE: 'bg-red-50 text-red-700',
    PROGRESS_UPDATE: 'bg-indigo-50 text-indigo-700',
    STATUS_CHANGE: 'bg-amber-50 text-amber-700',
    ASSIGN: 'bg-purple-50 text-purple-700',
    ACTIVATE: 'bg-emerald-50 text-emerald-700',
    COMPLETE: 'bg-teal-50 text-teal-700',
  };
  return colors[action] || 'bg-gray-100 text-gray-600';
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    CREATE: 'Create',
    UPDATE: 'Update',
    DELETE: 'Delete',
    PROGRESS_UPDATE: 'Progress',
    STATUS_CHANGE: 'Status',
    ASSIGN: 'Assign',
    ACTIVATE: 'Activate',
    COMPLETE: 'Complete',
  };
  return labels[action] || action;
}

function getEntityLabel(entityType: string): string {
  const labels: Record<string, string> = {
    OBJECTIVE: 'Objective',
    KEY_RESULT: 'Key Result',
    INITIATIVE: 'Initiative',
    SPRINT: 'Sprint',
  };
  return labels[entityType] || entityType;
}
