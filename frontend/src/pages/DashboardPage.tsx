import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query';
import { dashboardService, ActivityItem } from '../services/dashboard.service';
import { periodService } from '../services/period.service';
import { objectiveService } from '../services/objective.service';
import { initiativeService } from '../services/initiative.service';
import { sprintService } from '../services/sprint.service';
import { keyResultService } from '../services/keyResult.service';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { YearPicker } from '../components/atomics';
import { useAuthStore } from '../stores/useAuthStore';
import { Objective, Initiative, KeyResult } from '../types';
import toast from 'react-hot-toast';

export function DashboardPage() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'quarter' | 'annual'>('quarter');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => setSelectedPeriodId(null);
    window.addEventListener('reset-to-current-period', handler);
    return () => window.removeEventListener('reset-to-current-period', handler);
  }, []);

  const { data: periodsRes } = useQuery({
    queryKey: ['periods'],
    queryFn: () => periodService.getAll(),
  });

  const { data: currentPeriodRes } = useQuery({
    queryKey: ['periods', 'current'],
    queryFn: () => periodService.getCurrent(),
  });

  const currentPeriod = currentPeriodRes?.data?.data;
  const periods = periodsRes?.data?.data || [];
  const activePeriodId = selectedPeriodId || currentPeriod?.id;
  const selectedPeriod = periods.find(p => p.id === activePeriodId) || currentPeriod;


  const { data: dashRes } = useQuery({
    queryKey: ['dashboard', activePeriodId],
    queryFn: () => dashboardService.get(activePeriodId!),
    enabled: !!activePeriodId,
    placeholderData: keepPreviousData,
  });


  const { data: objRes, isLoading: isObjLoading } = useQuery({
    queryKey: ['objectives', activePeriodId],
    queryFn: () => objectiveService.getByPeriod(activePeriodId!, 1, 5),
    enabled: !!activePeriodId,
    placeholderData: keepPreviousData,
  });


  const { data: sprintsRes } = useQuery({
    queryKey: ['sprints', activePeriodId],
    queryFn: () => sprintService.getByPeriod(activePeriodId!),
    enabled: !!activePeriodId,
    placeholderData: keepPreviousData,
  });


  const { data: myInitRes } = useQuery({
    queryKey: ['my-active-sprint', activePeriodId],
    queryFn: () => initiativeService.getMyActiveSprintInitiatives(activePeriodId!),
    enabled: !!activePeriodId,
    placeholderData: keepPreviousData,
  });


  const { data: logsRes } = useQuery({
    queryKey: ['logs'],
    queryFn: () => dashboardService.getLogs(1, 20),
  });

  const { data: annualRes } = useQuery({
    queryKey: ['dashboard', 'annual', selectedPeriod?.year],
    queryFn: () => dashboardService.getAnnual(selectedPeriod?.year || new Date().getFullYear()),
    enabled: viewMode === 'annual' && !!(selectedPeriod?.year),
  });

  const dashboard = dashRes?.data?.data;
  const objectives = objRes?.data?.data || [];
  const sprints = sprintsRes?.data?.data || [];
  const activeSprint = sprints.find(s => s.status === 'ACTIVE');
  const myInitiatives = myInitRes?.data?.data?.initiatives || [];
  const logs: ActivityItem[] = logsRes?.data?.data || [];
  const annualData = annualRes?.data?.data;

  const handleLogClick = (log: ActivityItem) => {
    if (log.initiative_id) {
      navigate(`/objectives?highlight=${log.initiative_id}`);
    } else if (log.objective_id) {
      navigate(`/objectives?highlight=0&objective=${log.objective_id}`);
    }
  };

  return (
    <div className="max-w-full">

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard OKR</h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('quarter')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'quarter' ? 'bg-white text-primary shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Quarter
              </button>
              <button
                onClick={() => setViewMode('annual')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'annual' ? 'bg-white text-primary shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Annual
              </button>
            </div>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={async () => {
                  if (!selectedPeriod) return;
                  const quarterIndex = ['Q1','Q2','Q3','Q4'].indexOf(selectedPeriod.quarter);
                  if (quarterIndex === 0) {
                    const targetYear = selectedPeriod.year - 1;
                    const target = periods.find(p => p.year === targetYear && p.quarter === 'Q4');
                    if (target) { setSelectedPeriodId(target.id); }
                    else { await periodService.ensureYear(targetYear); queryClient.invalidateQueries({ queryKey: ['periods'] }); }
                  } else {
                    const prevQ = ['Q1','Q2','Q3','Q4'][quarterIndex - 1];
                    const target = periods.find(p => p.year === selectedPeriod.year && p.quarter === prevQ);
                    if (target) setSelectedPeriodId(target.id);
                  }
                }}
                className="px-1.5 py-1.5 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              {viewMode === 'quarter' && periods.filter(p => p.year === (selectedPeriod?.year || new Date().getFullYear())).map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriodId(p.id)}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
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
                onChange={async (targetYear) => {
                  const target = periods.find(p => p.year === targetYear);
                  if (target) { setSelectedPeriodId(target.id); }
                  else { await periodService.ensureYear(targetYear); queryClient.invalidateQueries({ queryKey: ['periods'] }); }
                }}
              />
              <button
                onClick={async () => {
                  if (!selectedPeriod) return;
                  const quarterIndex = ['Q1','Q2','Q3','Q4'].indexOf(selectedPeriod.quarter);
                  if (quarterIndex === 3) {
                    const targetYear = selectedPeriod.year + 1;
                    const target = periods.find(p => p.year === targetYear && p.quarter === 'Q1');
                    if (target) { setSelectedPeriodId(target.id); }
                    else { await periodService.ensureYear(targetYear); queryClient.invalidateQueries({ queryKey: ['periods'] }); }
                  } else {
                    const nextQ = ['Q1','Q2','Q3','Q4'][quarterIndex + 1];
                    const target = periods.find(p => p.year === selectedPeriod.year && p.quarter === nextQ);
                    if (target) setSelectedPeriodId(target.id);
                  }
                }}
                className="px-1.5 py-1.5 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          {viewMode === 'quarter'
            ? `Ringkasan pencapaian OKR untuk ${selectedPeriod?.quarter} ${selectedPeriod?.year}`
            : `Ringkasan tahunan OKR ${selectedPeriod?.year || new Date().getFullYear()}`
          }
        </p>
      </div>


      {viewMode === 'quarter' && (
        <>
          {(!activePeriodId || !dashboard) ? (
            <DashboardSkeleton />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <SummaryCard
                  label="Active Objectives"
                  value={dashboard.total_objectives}
                  desc={`${dashboard.on_track} on track, ${dashboard.at_risk} at risk`}
                  icon={<CircleTarget />}
                />
                <SummaryCard
                  label="Key Results"
                value={dashboard.on_track + dashboard.at_risk + dashboard.off_track}
                desc="Across all objectives"
                icon={<CheckCircle />}
              />
              <SummaryCard
                label="Initiatives"
                value={myInitiatives.length}
                desc="Action items in progress"
                icon={<TrendUp />}
              />
              <SummaryCard
                label="Overall Progress"
                value={`${dashboard.avg_progress.toFixed(0)}%`}
                progress={dashboard.avg_progress}
                icon={<ProgressCircle />}
              />
              </div>

          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-0.5">Objectives Aktif</h2>
                <p className="text-sm text-gray-500">Target utama & initiative Anda untuk quarter ini</p>
              </div>
              <button onClick={() => navigate('/objectives')} className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1">
                Lihat Semua
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              {(!activePeriodId || isObjLoading) ? null : objectives.length === 0 ? (
                <div className="text-center py-10 bg-white border border-dashed border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-400 mb-2">Belum ada objective di quarter ini.</p>
                  <button onClick={() => navigate('/objectives')} className="text-xs font-medium text-primary hover:underline">+ Buat Objective</button>
                </div>
              ) : (
                objectives.map((obj) => (
                  <DashboardObjectiveCard
                    key={obj.id}
                    objective={obj}
                    onNavigate={() => navigate(`/objectives?highlightObj=${obj.id}`)}
                  />
                ))
              )}
            </div>
          </section>

          {activeSprint && (
            <section className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Sprint Aktif</h2>
              <p className="text-sm text-gray-500 mb-4">Sprint yang sedang berjalan</p>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{activeSprint.name}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(activeSprint.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {new Date(activeSprint.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded">active</span>
                </div>
                {myInitiatives.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500">Progress</span>
                      <span className="text-xs font-semibold text-gray-700">
                        {(myInitiatives.reduce((sum, i) => sum + i.progress, 0) / myInitiatives.length).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${myInitiatives.reduce((sum, i) => sum + i.progress, 0) / myInitiatives.length}%` }} />
                    </div>
                    <p className="text-xs text-gray-400">{myInitiatives.length} initiatives</p>
                  </>
                )}
              </div>
            </section>
          )}
            </>
          )}
        </>
      )}

      {viewMode === 'annual' && annualData && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard label="Total Objectives" value={annualData.annual_summary.total_objectives} icon={<CircleTarget />} />
            <SummaryCard label="Avg Progress" value={`${annualData.annual_summary.avg_progress.toFixed(0)}%`} progress={annualData.annual_summary.avg_progress} icon={<ProgressCircle />} />
            <SummaryCard label="Completed" value={annualData.annual_summary.completed_objectives} desc={`${annualData.annual_summary.completion_rate.toFixed(0)}% completion rate`} icon={<CheckCircle />} />
            <SummaryCard label="Total Initiatives" value={annualData.annual_summary.total_initiatives} desc={`${annualData.annual_summary.total_overdue} overdue`} icon={<TrendUp />} />
          </div>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Perbandingan Quarter</h2>
            <p className="text-sm text-gray-500 mb-4">Performa per quarter tahun {annualData.year}</p>
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Quarter</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Objectives</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Progress</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">On Track</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">At Risk</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Off Track</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Done</th>
                  </tr>
                </thead>
                <tbody>
                  {annualData.quarters?.map((q) => (
                    <tr key={q.quarter} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-semibold text-gray-900">{q.quarter}</td>
                      <td className="text-center px-4 py-3 text-gray-700">{q.total_objectives}</td>
                      <td className="text-center px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${q.avg_progress}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{q.avg_progress.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="text-center px-4 py-3"><span className="text-green-600 font-medium">{q.on_track}</span></td>
                      <td className="text-center px-4 py-3"><span className="text-amber-600 font-medium">{q.at_risk}</span></td>
                      <td className="text-center px-4 py-3"><span className="text-red-600 font-medium">{q.off_track}</span></td>
                      <td className="text-center px-4 py-3"><span className="text-blue-600 font-medium">{q.done}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {viewMode === 'annual' && !annualData && (
        <div className="text-center py-12 text-gray-400 text-sm">Memuat data tahunan...</div>
      )}

      {logs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-0.5">Aktivitas Terbaru</h2>
              <p className="text-sm text-gray-500">Log perubahan terbaru dari semua tim</p>
            </div>
            <button onClick={() => navigate('/logs')} className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1">
              Lihat Semua
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-50">
            {logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 px-5 py-4 hover:bg-blue-50/40 cursor-pointer transition-colors"
                onClick={() => handleLogClick(log)}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 shrink-0">
                  <span className="text-xs font-bold text-primary">{log.user_name?.charAt(0)?.toUpperCase() || '?'}</span>
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
                  <p className="text-[11px] text-gray-400 mt-1">{getRelativeTime(log.created_at)}</p>
                </div>
                <div className="shrink-0 text-gray-300 mt-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({ label, value, desc, icon, progress }: {
  label: string; value: string | number; desc?: string; icon: React.ReactNode; progress?: number;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span className="text-gray-400">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {progress !== undefined && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
      {desc && <p className="text-xs text-gray-400">{desc}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PLANNING: 'bg-gray-100 text-gray-600',
    ON_TRACK: 'bg-green-50 text-green-700',
    AT_RISK: 'bg-yellow-50 text-yellow-700',
    OFF_TRACK: 'bg-red-50 text-red-700',
    DONE: 'bg-blue-50 text-blue-700',
    ARCHIVED: 'bg-gray-100 text-gray-500',
  };
  const display = status.replace('_', ' ');
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded ${styles[status] || styles.PLANNING}`}>
      {display}
    </span>
  );
}

function CircleTarget() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function CheckCircle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function TrendUp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" />
    </svg>
  );
}
function ProgressCircle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex justify-between mb-3">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-5 w-5 bg-gray-100 rounded" />
            </div>
            <div className="h-7 w-12 bg-gray-200 rounded mb-2" />
            <div className="h-2.5 w-28 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="mb-8">
        <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-3 w-56 bg-gray-100 rounded mb-4" />
        <div className="space-y-3">
          {[1,2].map(i => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex justify-between mb-3">
                <div className="h-4 w-48 bg-gray-200 rounded" />
                <div className="h-5 w-16 bg-gray-100 rounded" />
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full mb-2" />
              <div className="h-3 w-24 bg-gray-100 rounded mt-3" />
            </div>
          ))}
        </div>
      </div>
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

function DashboardObjectiveCard({ objective, onNavigate }: {
  objective: Objective; onNavigate: () => void;
}) {
  const { user } = useAuthStore();
  const [expandedKR, setExpandedKR] = useState<number | null>(null);

  const { data: krsRes } = useQuery({
    queryKey: ['key-results', objective.id],
    queryFn: () => keyResultService.getByObjective(objective.id),
  });
  const krs: KeyResult[] = krsRes?.data?.data || [];

  const { data: treesRes } = useQuery({
    queryKey: ['dashboard-initiatives', objective.id],
    queryFn: async () => {
      const results: Record<number, Initiative[]> = {};
      for (const kr of krs) {
        const res = await initiativeService.getTree(kr.id);
        results[kr.id] = res.data.data || [];
      }
      return results;
    },
    enabled: krs.length > 0,
  });

  const findMyLeafInitiatives = (nodes: Initiative[]): { initiative: Initiative; parentTitle: string | null }[] => {
    const result: { initiative: Initiative; parentTitle: string | null }[] = [];
    const traverse = (items: Initiative[], parentName: string | null) => {
      for (const item of items) {
        const hasChildren = item.children && item.children.length > 0;
        if (!hasChildren && item.assignee_id === user?.id && item.status !== 'DONE' && item.status !== 'CANCELLED') {
          result.push({ initiative: item, parentTitle: parentName });
        }
        if (item.children) traverse(item.children, item.title);
      }
    };
    traverse(nodes, null);
    return result;
  };

  const progressColor = objective.progress >= 70 ? 'bg-emerald-500' : objective.progress >= 40 ? 'bg-primary' : 'bg-gray-400';

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 sm:p-5 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={onNavigate}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-gray-900">{objective.title}</h3>
          <StatusBadge status={objective.status} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${progressColor} transition-all duration-500`} style={{ width: `${objective.progress}%` }} />
          </div>
          <span className="text-sm font-bold text-gray-800 w-10 text-right">{objective.progress.toFixed(0)}%</span>
        </div>
      </div>

      {krs.length > 0 && (
        <div className="border-t border-gray-100 px-4 sm:px-5 py-3">
          <div className="space-y-2">
            {krs.map(kr => {
              const initiatives = treesRes?.[kr.id] || [];
              const myLeafs = findMyLeafInitiatives(initiatives);
              const isExpanded = expandedKR === kr.id;

              return (
                <div key={kr.id}>
                  <div
                    className="flex items-center justify-between py-1.5 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setExpandedKR(isExpanded ? null : kr.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-3.5 h-3.5 flex items-center justify-center text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6" /></svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700 truncate">{kr.title}</span>
                      {myLeafs.length > 0 && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">{myLeafs.length}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-gray-500">{kr.progress.toFixed(0)}%</span>
                  </div>

                  {isExpanded && myLeafs.length > 0 && (
                    <div className="ml-5 space-y-2 py-2">
                      {myLeafs.map(({ initiative: init, parentTitle }) => (
                        <DashboardInitProgress key={init.id} initiative={init} parentTitle={parentTitle} />
                      ))}
                    </div>
                  )}
                  {isExpanded && myLeafs.length === 0 && (
                    <p className="ml-5 text-[11px] text-gray-400 py-1">Tidak ada initiative Anda yang perlu diupdate.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardInitProgress({ initiative, parentTitle }: { initiative: Initiative; parentTitle: string | null }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [value, setValue] = useState(initiative.progress);
  const [note, setNote] = useState('');
  const [blocker, setBlocker] = useState('');
  const [dirty, setDirty] = useState(false);
  const [showFields, setShowFields] = useState(false);

  const mutation = useMutation({
    mutationFn: () => initiativeService.updateProgress(initiative.id, { progress: value, note, blocker }),
    onSuccess: () => {
      toast.success('Progress saved');
      queryClient.invalidateQueries({ queryKey: ['initiative-tree'] });
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDirty(false);
      setShowFields(false);
      setNote('');
      setBlocker('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div
      className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-blue-50/50 transition-colors group"
      onClick={() => navigate(`/objectives?highlight=${initiative.id}`)}
    >
      {parentTitle && (
        <p className="text-[10px] text-gray-400 mb-1 truncate">↳ {parentTitle}</p>
      )}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-800 truncate group-hover:text-primary transition-colors">
          {initiative.title}
        </span>
        <span className="text-[10px] font-bold text-gray-500">{value}%</span>
      </div>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <input
          type="range" min="0" max="100" value={value}
          onChange={(e) => { setValue(Number(e.target.value)); setDirty(true); setShowFields(true); }}
          className="flex-1 h-1.5 accent-primary cursor-pointer"
        />
      </div>
      {showFields && dirty && (
        <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <input
            type="text" placeholder="Note (opsional)" value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-2.5 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
          />
          <input
            type="text" placeholder="Blocker (opsional)" value={blocker}
            onChange={(e) => setBlocker(e.target.value)}
            className="w-full px-2.5 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setDirty(false); setShowFields(false); setValue(initiative.progress); }} className="text-[10px] text-gray-500 hover:text-gray-700">Batal</button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="text-[10px] font-semibold text-primary hover:underline">
              {mutation.isPending ? '...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
