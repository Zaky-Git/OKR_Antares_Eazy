import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintService } from '../services/sprint.service';
import { periodService } from '../services/period.service';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { YearPicker } from '../components/atomics';
import { Sprint, SprintSummary as SprintSummaryT } from '../types';
import { DetailPanel } from '../components/organisms/DetailPanel';
import { SprintPanel } from '../components/organisms/SprintPanel';
import CompleteSprintModal from '../components/organisms/CompleteSprintModal';
import toast from 'react-hot-toast';

type PanelState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; sprint: Sprint };

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Semua' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function SprintsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [panel, setPanel] = useState<PanelState>({ type: 'none' });
  const [completeSprint, setCompleteSprint] = useState<Sprint | null>(null);
  const [highlightedSprintId, setHighlightedSprintId] = useState<number | null>(null);

  useEffect(() => {
    const handler = () => setSelectedPeriodId(null);
    window.addEventListener('reset-to-current-period', handler);
    return () => window.removeEventListener('reset-to-current-period', handler);
  }, []);

  const { data: periodsRes } = useQuery({ queryKey: ['periods'], queryFn: () => periodService.getAll() });
  const { data: currentPeriodRes } = useQuery({ queryKey: ['periods', 'current'], queryFn: () => periodService.getCurrent() });
  const periods = periodsRes?.data?.data || [];
  const currentPeriod = currentPeriodRes?.data?.data;
  const activePeriodId = selectedPeriodId || currentPeriod?.id;
  const selectedPeriod = periods.find(p => p.id === activePeriodId) || currentPeriod;

  const { data: sprintRes, isLoading } = useQuery({
    queryKey: ['sprints', activePeriodId],
    queryFn: () => sprintService.getByPeriod(activePeriodId!),
    enabled: !!activePeriodId,
    staleTime: 0, // always refetch when navigating back
  });

  const sprints: Sprint[] = Array.isArray(sprintRes?.data?.data) ? sprintRes!.data.data : [];

  // Fetch summaries for all sprints
  const { data: summariesData } = useQuery({
    queryKey: ['sprint-summaries', activePeriodId, sprints.map(s => s.id).join(',')],
    queryFn: async () => {
      const results: Record<number, SprintSummaryT> = {};
      await Promise.all(
        sprints.map(async (sprint) => {
          try {
            const res = await sprintService.getSprintSummary(sprint.id);
            results[sprint.id] = res.data.data;
          } catch {
            results[sprint.id] = {
              total_initiatives: 0, todo_count: 0, in_progress_count: 0,
              blocked_count: 0, done_count: 0, cancelled_count: 0, sprint_progress: 0,
            };
          }
        })
      );
      return results;
    },
    enabled: sprints.length > 0,
  });

  const summaries: Record<number, SprintSummaryT> = summariesData || {};

  // Sort sprints: ACTIVE first, then PLANNING by start_date ASC, then COMPLETED by end_date DESC
  const sortedSprints = useMemo(() => {
    const statusOrder: Record<string, number> = { ACTIVE: 0, PLANNING: 1, COMPLETED: 2 };
    const filtered = statusFilter === 'ALL' ? sprints : sprints.filter(s => s.status === statusFilter);
    return [...filtered].sort((a, b) => {
      const orderA = statusOrder[a.status] ?? 3;
      const orderB = statusOrder[b.status] ?? 3;
      if (orderA !== orderB) return orderA - orderB;
      if (a.status === 'PLANNING') return new Date(a.start_date.slice(0, 10) + 'T00:00:00').getTime() - new Date(b.start_date.slice(0, 10) + 'T00:00:00').getTime();
      if (a.status === 'COMPLETED') return new Date(b.end_date.slice(0, 10) + 'T00:00:00').getTime() - new Date(a.end_date.slice(0, 10) + 'T00:00:00').getTime();
      return 0;
    });
  }, [sprints, statusFilter]);

  useEffect(() => {
    const hl = searchParams.get('highlightSprint');
    if (hl) {
      setHighlightedSprintId(Number(hl));
      const timer = setTimeout(() => {
        setHighlightedSprintId(null);
        setSearchParams({}, { replace: true });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const activateMutation = useMutation({
    mutationFn: (id: number) => sprintService.activate(id),
    onSuccess: () => {
      toast.success('Sprint berhasil diaktifkan');
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal mengaktifkan sprint'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sprintService.delete(id),
    onSuccess: () => {
      toast.success('Sprint dihapus');
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal menghapus sprint'),
  });

  const closePanel = () => setPanel({ type: 'none' });

  const handleQuarterChange = async (quarter: string) => {
    if (!selectedPeriod) return;
    const target = periods.find(p => p.year === selectedPeriod.year && p.quarter === quarter);
    if (target) setSelectedPeriodId(target.id);
  };

  const handleYearChange = async (targetYear: number) => {
    const target = periods.find(p => p.year === targetYear);
    if (target) {
      setSelectedPeriodId(target.id);
    } else {
      await periodService.ensureYear(targetYear);
      queryClient.invalidateQueries({ queryKey: ['periods'] });
    }
  };

  const handlePrevQuarter = async () => {
    if (!selectedPeriod) return;
    const idx = ['Q1', 'Q2', 'Q3', 'Q4'].indexOf(selectedPeriod.quarter);
    if (idx === 0) {
      const targetYear = selectedPeriod.year - 1;
      const target = periods.find(p => p.year === targetYear && p.quarter === 'Q4');
      if (target) setSelectedPeriodId(target.id);
      else { await periodService.ensureYear(targetYear); queryClient.invalidateQueries({ queryKey: ['periods'] }); }
    } else {
      const prevQ = ['Q1', 'Q2', 'Q3', 'Q4'][idx - 1];
      const target = periods.find(p => p.year === selectedPeriod.year && p.quarter === prevQ);
      if (target) setSelectedPeriodId(target.id);
    }
  };

  const handleNextQuarter = async () => {
    if (!selectedPeriod) return;
    const idx = ['Q1', 'Q2', 'Q3', 'Q4'].indexOf(selectedPeriod.quarter);
    if (idx === 3) {
      const targetYear = selectedPeriod.year + 1;
      const target = periods.find(p => p.year === targetYear && p.quarter === 'Q1');
      if (target) setSelectedPeriodId(target.id);
      else { await periodService.ensureYear(targetYear); queryClient.invalidateQueries({ queryKey: ['periods'] }); }
    } else {
      const nextQ = ['Q1', 'Q2', 'Q3', 'Q4'][idx + 1];
      const target = periods.find(p => p.year === selectedPeriod.year && p.quarter === nextQ);
      if (target) setSelectedPeriodId(target.id);
    }
  };

  return (
    <div className="max-w-full relative">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sprints</h1>
            <p className="text-sm text-gray-500 mt-1">
              Kelola sprint untuk {selectedPeriod?.quarter} {selectedPeriod?.year}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quarter selector */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button onClick={handlePrevQuarter} className="px-1.5 py-1.5 text-gray-400 hover:text-gray-700 transition-colors" title="Quarter sebelumnya">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              {periods.filter(p => p.year === (selectedPeriod?.year || new Date().getFullYear())).map(p => (
                <button
                  key={p.id}
                  onClick={() => handleQuarterChange(p.quarter)}
                  className={`px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                    p.id === activePeriodId
                      ? 'bg-white text-primary shadow-sm font-semibold'
                      : p.is_current
                        ? 'text-primary/70 hover:text-primary'
                        : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p.quarter}
                  {p.is_current && p.id !== activePeriodId && <span className="ml-1 w-1.5 h-1.5 bg-primary rounded-full inline-block" />}
                </button>
              ))}
              <YearPicker
                value={selectedPeriod?.year || new Date().getFullYear()}
                years={[...new Set(periods.map(p => p.year))]}
                onChange={handleYearChange}
              />
              <button onClick={handleNextQuarter} className="px-1.5 py-1.5 text-gray-400 hover:text-gray-700 transition-colors" title="Quarter berikutnya">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
            <button
              onClick={() => setPanel({ type: 'create' })}
              className="px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              Buat Sprint
            </button>
          </div>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {STATUS_FILTERS.map(f => {
          const count = f.value === 'ALL' ? sprints.length : sprints.filter(s => s.status === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                statusFilter === f.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f.label}
              <span className="ml-1 text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Memuat sprints...</span>
          </div>
        </div>
      ) : sprints.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-2xl">
          <div className="w-16 h-16 mx-auto bg-primary/5 rounded-full flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#194FBC" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Belum ada sprint</h3>
          <p className="text-sm text-gray-500 mb-4">Mulai sprint pertama untuk quarter {selectedPeriod?.quarter} {selectedPeriod?.year}.</p>
          <button onClick={() => setPanel({ type: 'create' })} className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5">
            + Buat Sprint Pertama
          </button>
        </div>
      ) : sortedSprints.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl">
          <p className="text-sm text-gray-500">Tidak ada sprint dengan status ini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSprints.map((sprint) => (
            <SprintCard
              key={sprint.id}
              sprint={sprint}
              summary={summaries[sprint.id]}
              isHighlighted={highlightedSprintId === sprint.id}
              onClick={() => navigate(`/sprints/${sprint.id}`)}
              onEdit={() => setPanel({ type: 'edit', sprint })}
              onActivate={() => activateMutation.mutate(sprint.id)}
              onComplete={() => setCompleteSprint(sprint)}
              onDelete={() => {
                if (confirm(`Hapus sprint "${sprint.name}"?`)) deleteMutation.mutate(sprint.id);
              }}
              isActivating={activateMutation.isPending && activateMutation.variables === sprint.id}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === sprint.id}
            />
          ))}
        </div>
      )}

      {/* Sprint Create/Edit Drawer */}
      <DetailPanel
        open={panel.type !== 'none'}
        onClose={closePanel}
        title={panel.type === 'edit' ? 'Detail Sprint' : 'Buat Sprint'}
      >
        {panel.type === 'create' && activePeriodId && selectedPeriod && (
          <SprintPanel periodId={activePeriodId} period={selectedPeriod} onClose={closePanel} />
        )}
        {panel.type === 'edit' && selectedPeriod && (
          <SprintPanel sprint={panel.sprint} periodId={panel.sprint.period_id} period={selectedPeriod} onClose={closePanel} />
        )}
      </DetailPanel>

      {/* Complete Sprint Modal */}
      {completeSprint && (
        <CompleteSprintModal
          open={!!completeSprint}
          onClose={() => setCompleteSprint(null)}
          sprintId={completeSprint.id}
          sprintName={completeSprint.name}
        />
      )}
    </div>
  );
}

interface SprintCardProps {
  sprint: Sprint;
  summary?: SprintSummaryT;
  isHighlighted: boolean;
  onClick: () => void;
  onEdit: () => void;
  onActivate: () => void;
  onComplete: () => void;
  onDelete: () => void;
  isActivating: boolean;
  isDeleting: boolean;
}

function SprintCard({ sprint, summary, isHighlighted, onClick, onEdit, onActivate, onComplete, onDelete, isActivating, isDeleting }: SprintCardProps) {
  const isPlanning = sprint.status === 'PLANNING';
  const isActive = sprint.status === 'ACTIVE';
  const isCompleted = sprint.status === 'COMPLETED';

  const statusBarColor = isActive ? 'bg-emerald-500' : isCompleted ? 'bg-blue-500' : 'bg-gray-300';

  const stop = (handler: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    handler();
  };

  return (
    <div
      className={`bg-white border rounded-2xl overflow-hidden transition-all hover:border-gray-300 hover:shadow-sm ${
        isActive ? 'border-primary/40 ring-1 ring-primary/20' : 'border-gray-200'
      } ${isHighlighted ? 'ring-2 ring-primary ring-offset-2 animate-pulse' : ''}`}
      data-highlight-sprint={isHighlighted || undefined}
    >
      {/* Status accent bar */}
      <div className={`h-1 ${statusBarColor}`} />

      {/* Main clickable area */}
      <div className="p-4 md:p-5 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={onClick}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-base font-bold text-gray-900 truncate">{sprint.name}</h3>
              <SprintStatusBadge status={sprint.status} />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(sprint.start_date)} — {formatDate(sprint.end_date)}</span>
              <span className="text-gray-300">•</span>
              <span>{daysDuration(sprint.start_date, sprint.end_date)} hari</span>
            </div>
            {sprint.goal && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                <span className="font-medium text-gray-700">Goal:</span> {sprint.goal}
              </p>
            )}
          </div>
        </div>

        {/* Progress + initiative count */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 sm:gap-4 items-center mt-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-500">Sprint Progress</span>
                <span className="text-xs font-bold text-gray-700">{summary.sprint_progress.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    summary.sprint_progress >= 100 ? 'bg-emerald-500' : summary.sprint_progress >= 70 ? 'bg-emerald-400' : 'bg-primary'
                  }`}
                  style={{ width: `${summary.sprint_progress}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-xs">
              <CountPill count={summary.total_initiatives} label="Total" color="bg-gray-100 text-gray-600" />
              {summary.in_progress_count > 0 && <CountPill count={summary.in_progress_count} label="In Progress" color="bg-indigo-50 text-indigo-700" />}
              {summary.blocked_count > 0 && <CountPill count={summary.blocked_count} label="Blocked" color="bg-red-50 text-red-700" />}
              {summary.done_count > 0 && <CountPill count={summary.done_count} label="Done" color="bg-blue-50 text-blue-700" />}
            </div>
          </div>
        )}

        {/* Review/Retro for completed */}
        {isCompleted && (sprint.review_note || sprint.retro_note) && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-3">
            {sprint.review_note && (
              <div className="bg-blue-50/50 rounded-lg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 mb-1">Review</p>
                <p className="text-xs text-gray-700 line-clamp-3">{sprint.review_note}</p>
              </div>
            )}
            {sprint.retro_note && (
              <div className="bg-amber-50/50 rounded-lg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 mb-1">Retro</p>
                <p className="text-xs text-gray-700 line-clamp-3">{sprint.retro_note}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      {!isCompleted && (
        <div className="px-4 md:px-5 py-2.5 border-t border-gray-100 flex items-center justify-end gap-1.5 bg-gray-50/50">
          {isPlanning && (
            <>
              <button
                onClick={stop(onActivate)}
                disabled={isActivating}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-2.5 py-1 rounded-md hover:bg-emerald-50 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {isActivating ? 'Mengaktifkan...' : 'Activate'}
              </button>
              <button onClick={stop(onEdit)} className="text-xs font-medium text-gray-600 hover:text-gray-800 px-2.5 py-1 rounded-md hover:bg-gray-100 transition-colors">
                Edit
              </button>
              <button
                onClick={stop(onDelete)}
                disabled={isDeleting}
                className="text-xs font-medium text-red-500 hover:text-red-700 px-2.5 py-1 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Hapus
              </button>
            </>
          )}
          {isActive && (
            <button
              onClick={stop(onComplete)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Complete Sprint
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CountPill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${color}`}>
      <span>{count}</span>
      <span className="font-normal opacity-80">{label}</span>
    </span>
  );
}

function SprintStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PLANNING: { label: 'Planning', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    ACTIVE: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    COMPLETED: { label: 'Completed', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  };
  const c = config[status] || config.PLANNING;
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${c.className}`}>
      {c.label}
    </span>
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysDuration(start: string, end: string): number {
  const s = new Date(start.slice(0, 10) + 'T00:00:00').getTime();
  const e = new Date(end.slice(0, 10) + 'T00:00:00').getTime();
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}
