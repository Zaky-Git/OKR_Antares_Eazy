import { useQuery } from '@tanstack/react-query';
import { sprintService } from '../../services/sprint.service';

interface SprintSummaryProps {
  sprintId: number;
}

interface SprintSummaryData {
  total_initiatives: number;
  todo_count: number;
  in_progress_count: number;
  blocked_count: number;
  done_count: number;
  cancelled_count: number;
  sprint_progress: number;
}

export function SprintSummary({ sprintId }: SprintSummaryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['sprint-summary', sprintId],
    queryFn: () => sprintService.getSprintSummary(sprintId),
    enabled: !!sprintId,
  });

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-center min-h-[80px]">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs">Memuat...</span>
        </div>
      </div>
    );
  }

  const summary: SprintSummaryData | undefined = data?.data?.data;
  if (!summary) return null;

  const total = summary.total_initiatives;
  const progress = summary.sprint_progress;

  // Stacked bar segments
  const segments = [
    { count: summary.done_count, color: 'bg-blue-500' },
    { count: summary.in_progress_count, color: 'bg-indigo-400' },
    { count: summary.blocked_count, color: 'bg-red-400' },
    { count: summary.todo_count, color: 'bg-gray-300' },
    { count: summary.cancelled_count, color: 'bg-gray-200' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">Sprint Progress</h3>
        <span className="text-xs text-gray-500">{total} initiative</span>
      </div>

      {/* Progress bar + percentage */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
          {segments.map((seg, i) => {
            const pct = total > 0 ? (seg.count / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={i}
                className={`h-full ${seg.color} transition-all`}
                style={{ width: `${pct}%` }}
              />
            );
          })}
        </div>
        <span className="text-lg font-bold text-gray-900 min-w-[48px] text-right">{progress.toFixed(0)}%</span>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-5 gap-2">
        <StatusPill label="To Do" count={summary.todo_count} dotClass="bg-gray-400" />
        <StatusPill label="Progress" count={summary.in_progress_count} dotClass="bg-indigo-500" />
        <StatusPill label="Blocked" count={summary.blocked_count} dotClass="bg-red-500" />
        <StatusPill label="Done" count={summary.done_count} dotClass="bg-blue-500" />
        <StatusPill label="Cancelled" count={summary.cancelled_count} dotClass="bg-gray-300" />
      </div>
    </div>
  );
}

function StatusPill({ label, count, dotClass }: { label: string; count: number; dotClass: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        <span className="text-sm font-bold text-gray-900">{count}</span>
      </div>
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}
