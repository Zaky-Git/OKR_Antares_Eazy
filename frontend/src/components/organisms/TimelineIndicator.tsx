interface TimelineIndicatorProps {
  startDate: string;
  endDate: string;
  status: string;
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA.slice(0, 10) + 'T00:00:00');
  const b = new Date(dateB.slice(0, 10) + 'T00:00:00');
  const diffMs = b.getTime() - a.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TimelineIndicator({ startDate, endDate, status }: TimelineIndicatorProps) {
  if (status !== 'ACTIVE') return null;

  const today = getTodayString();
  const totalDuration = Math.max(daysBetween(startDate, endDate) + 1, 1); // inclusive
  const daysFromStart = daysBetween(startDate, today);
  const isOverdue = daysFromStart >= totalDuration;
  const daysOverdue = isOverdue ? daysFromStart - totalDuration + 1 : 0;
  const daysElapsed = Math.min(Math.max(daysFromStart + 1, 0), totalDuration);
  const daysRemaining = Math.max(totalDuration - daysElapsed, 0);
  const elapsedPercentage = (daysElapsed / totalDuration) * 100;

  const isAlmostDue = !isOverdue && daysRemaining <= 2 && daysRemaining > 0;

  return (
    <div className={`bg-white border rounded-2xl p-5 ${isOverdue ? 'border-red-200' : isAlmostDue ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isOverdue ? 'bg-red-50' : isAlmostDue ? 'bg-amber-50' : 'bg-emerald-50'
          }`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2"
              stroke={isOverdue ? '#dc2626' : isAlmostDue ? '#d97706' : '#059669'}>
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Sprint Timeline</h3>
            <p className="text-[11px] text-gray-500">
              Hari ke-{Math.min(Math.max(daysFromStart + 1, 1), totalDuration)} dari {totalDuration}
            </p>
          </div>
        </div>

        {isOverdue ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            <span className="text-[11px] font-semibold text-red-700">
              Overdue {daysOverdue} hari
            </span>
          </div>
        ) : (
          <div className={`px-2.5 py-1 rounded-full ${
            isAlmostDue ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'
          }`}>
            <span className={`text-[11px] font-semibold ${isAlmostDue ? 'text-amber-700' : 'text-emerald-700'}`}>
              {daysRemaining === 0 ? 'Hari terakhir' : `${daysRemaining} hari tersisa`}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverdue ? 'bg-red-500' : isAlmostDue ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(elapsedPercentage, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
          <span>{formatDate(startDate)}</span>
          <span>{elapsedPercentage.toFixed(0)}%</span>
          <span>{formatDate(endDate)}</span>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}
