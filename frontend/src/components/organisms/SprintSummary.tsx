import { useQuery } from '@tanstack/react-query';
import { sprintService } from '../../services/sprint.service';

interface SprintSummaryProps {
  sprintId: number;
}

interface StatusStat {
  key: keyof Pick<SprintSummaryData, 'todo_count' | 'in_progress_count' | 'blocked_count' | 'done_count' | 'cancelled_count'>;
  label: string;
  dotClass: string;
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

const STATUS_STATS: StatusStat[] = [
  { key: 'todo_count', label: 'To Do', dotClass: 'bg-gray-400' },
  { key: 'in_progress_count', label: 'In Progress', dotClass: 'bg-indigo-500' },
  { key: 'blocked_count', label: 'Blocked', dotClass: 'bg-red-500' },
  { key: 'done_count', label: 'Done', dotClass: 'bg-blue-500' },
  { key: 'cancelled_count', label: 'Cancelled', dotClass: 'bg-gray-300' },
];

export function SprintSummary({ sprintId }: SprintSummaryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['sprint-summary', sprintId],
    queryFn: () => sprintService.getSprintSummary(sprintId),
    enabled: !!sprintId,
  });

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-center min-h-[140px]">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs">Memuat summary...</span>
        </div>
      </div>
    );
  }

  const summary = data?.data?.data;
  if (!summary) return null;

  const progressColor =
    summary.sprint_progress >= 100 ? 'from-emerald-400 to-emerald-500' :
    summary.sprint_progress >= 70 ? 'from-emerald-400 to-emerald-500' :
    summary.sprint_progress >= 40 ? 'from-blue-400 to-blue-500' :
    'from-primary to-primary-hover';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-gray-900">Sprint Summary</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {summary.total_initiatives} initiative{summary.total_initiatives !== 1 ? 's' : ''} dalam sprint ini
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-8 items-start">
        {/* Progress */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sprint Progress</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">{summary.sprint_progress.toFixed(0)}</span>
              <span className="text-sm font-semibold text-gray-500">%</span>
            </div>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-700`}
              style={{ width: `${Math.min(100, Math.max(0, summary.sprint_progress))}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Dihitung dari rata-rata progress semua root initiative
          </p>
        </div>

        {/* Status counts */}
        <div className="grid grid-cols-5 lg:grid-cols-1 gap-2 lg:gap-1.5 lg:min-w-[160px]">
          {STATUS_STATS.map(({ key, label, dotClass }) => {
            const count = summary[key];
            const percentage = summary.total_initiatives > 0
              ? (count / summary.total_initiatives) * 100
              : 0;
            return (
              <div
                key={key}
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-gray-50 lg:bg-transparent rounded-lg lg:rounded-none lg:border-b lg:border-gray-100 px-2 py-2 lg:py-2 lg:last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dotClass} flex-shrink-0`} />
                  <span className="text-[10px] lg:text-xs font-medium text-gray-600 truncate">{label}</span>
                </div>
                <div className="flex items-baseline gap-1 mt-1 lg:mt-0">
                  <span className="text-base lg:text-sm font-bold text-gray-900">{count}</span>
                  {summary.total_initiatives > 0 && (
                    <span className="text-[10px] text-gray-400 hidden lg:inline">{percentage.toFixed(0)}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
