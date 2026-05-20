import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintService } from '../../services/sprint.service';
import { SprintInitiative } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  sprintId: number;
}

const STATUS_DOT_COLOR: Record<string, string> = {
  TODO: 'bg-gray-400',
  IN_PROGRESS: 'bg-indigo-500',
  BLOCKED: 'bg-red-500',
  DONE: 'bg-blue-500',
  CANCELLED: 'bg-gray-300',
};

const STATUS_LABEL: Record<string, string> = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function BacklogPanel({ sprintId }: Props) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sprint-backlog', sprintId],
    queryFn: () => sprintService.getSprintBacklog(sprintId),
  });

  const assignMutation = useMutation({
    mutationFn: (initiativeId: number) =>
      sprintService.assignInitiativeToSprint(initiativeId, { sprint_id: sprintId }),
    onSuccess: () => {
      toast.success('Initiative berhasil di-assign ke sprint');
      queryClient.invalidateQueries({ queryKey: ['sprint-initiatives', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-summary', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-backlog', sprintId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal assign initiative');
    },
  });

  const backlogItems: SprintInitiative[] = data?.data?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Memuat backlog...</span>
        </div>
      </div>
    );
  }

  if (backlogItems.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl">
        <div className="w-12 h-12 mx-auto bg-white rounded-full flex items-center justify-center mb-2 shadow-sm">
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700 mb-0.5">Backlog kosong</p>
        <p className="text-xs text-gray-500">Semua initiative di quarter ini sudah ditugaskan ke sprint.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {backlogItems.map((item) => (
        <div
          key={item.id}
          className="bg-white border border-gray-200 rounded-xl p-3.5 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start gap-3">
            <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${STATUS_DOT_COLOR[item.status] || STATUS_DOT_COLOR.TODO}`} />

            <div className="flex-1 min-w-0">
              {/* Breadcrumb */}
              {(item.objective_title || item.key_result_title) && (
                <p className="text-[11px] text-gray-400 truncate mb-0.5">
                  {item.objective_title} <span className="text-gray-300">›</span> {item.key_result_title}
                </p>
              )}

              {/* Title + Status */}
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold text-gray-800 truncate">{item.title}</h4>
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {STATUS_LABEL[item.status] || item.status}
                </span>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.progress >= 100 ? 'bg-emerald-500' : item.progress >= 70 ? 'bg-emerald-400' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-gray-500 min-w-[32px] text-right">
                  {Math.round(item.progress)}%
                </span>
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                {item.assignee_name ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white text-[8px] font-bold">
                      {getInitials(item.assignee_name)}
                    </span>
                    {item.assignee_name}
                  </span>
                ) : (
                  <span className="italic text-gray-400">No assignee</span>
                )}
                {item.due_date && (
                  <span className="flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    {formatDate(item.due_date)}
                  </span>
                )}
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={() => assignMutation.mutate(item.id)}
              disabled={assignMutation.isPending && assignMutation.variables === item.id}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {assignMutation.isPending && assignMutation.variables === item.id ? (
                <span>...</span>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Assign
                </>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
