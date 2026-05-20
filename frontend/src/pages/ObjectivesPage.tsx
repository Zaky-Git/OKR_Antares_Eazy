import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { objectiveService } from '../services/objective.service';
import { keyResultService } from '../services/keyResult.service';
import { initiativeService } from '../services/initiative.service';
import { periodService } from '../services/period.service';
import { authService } from '../services/auth.service';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Objective, KeyResult, Initiative } from '../types';
import { DetailPanel } from '../components/organisms/DetailPanel';
import { ObjectivePanel } from '../components/organisms/ObjectivePanel';
import { KeyResultPanel } from '../components/organisms/KeyResultPanel';
import { InitiativePanel } from '../components/organisms/InitiativePanel';
import { ContextBadges } from '../components/organisms/ContextBadges';
import { OwnerAvatar } from '../components/organisms/OwnerAvatar';
import { FilterChips, FilterChipsState } from '../components/organisms/FilterChips';
import { YearPicker } from '../components/atomics';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/useAuthStore';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type PanelState =
  | { type: 'none' }
  | { type: 'objective-create' }
  | { type: 'objective-edit'; objective: Objective }
  | { type: 'kr-create'; objectiveId: number }
  | { type: 'kr-edit'; keyResult: KeyResult; objectiveId: number }
  | { type: 'initiative-create'; keyResultId: number; parentId?: number }
  | { type: 'initiative-edit'; initiative: Initiative; keyResultId: number; parentInitiative?: Initiative };

export function ObjectivesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

  useEffect(() => {
    const handler = () => setSelectedPeriodId(null);
    window.addEventListener('reset-to-current-period', handler);
    return () => window.removeEventListener('reset-to-current-period', handler);
  }, []);
  const [expandedObj, setExpandedObj] = useState<Set<number>>(new Set());
  const [panel, setPanel] = useState<PanelState>({ type: 'none' });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [contextFilter, setContextFilter] = useState<FilterChipsState>({ strategyId: null, segmentId: null, divisionId: null });
  const [highlightedInitiativeId, setHighlightedInitiativeId] = useState<number | null>(null);
  const [highlightedObjId, setHighlightedObjId] = useState<number | null>(null);
  const [highlightedKRId, setHighlightedKRId] = useState<number | null>(null);

  const { data: periodsRes } = useQuery({ queryKey: ['periods'], queryFn: () => periodService.getAll() });
  const { data: currentPeriodRes, isLoading: isPeriodLoading } = useQuery({ queryKey: ['periods', 'current'], queryFn: () => periodService.getCurrent() });
  const periods = periodsRes?.data?.data || [];
  const currentPeriod = currentPeriodRes?.data?.data;
  const activePeriodId = selectedPeriodId || currentPeriod?.id;
  const selectedPeriod = periods.find(p => p.id === activePeriodId) || currentPeriod;

  const { data: objRes, isLoading } = useQuery({
    queryKey: ['objectives', activePeriodId, contextFilter.strategyId, contextFilter.segmentId, contextFilter.divisionId],
    queryFn: () => objectiveService.getByPeriod(activePeriodId!, {
      page: 1,
      limit: 50,
      strategy_id: contextFilter.strategyId ?? undefined,
      segment_id: contextFilter.segmentId ?? undefined,
      division_id: contextFilter.divisionId ?? undefined,
    }),
    enabled: !!activePeriodId,
    placeholderData: keepPreviousData,
  });
  const objectives = objRes?.data?.data || [];
  const filteredObjectives = statusFilter === 'ALL' ? objectives : objectives.filter(o => o.status === statusFilter);

  useEffect(() => {
    if (objectives.length > 0) setExpandedObj(new Set(objectives.map(o => o.id)));
  }, [objectives.length]);


  useEffect(() => {
    const highlight = searchParams.get('highlight');
    const highlightObj = searchParams.get('highlightObj');
    const highlightKR = searchParams.get('highlightKR');

    if (highlight || highlightObj || highlightKR) {
      if (highlight) setHighlightedInitiativeId(Number(highlight));
      if (highlightObj) setHighlightedObjId(Number(highlightObj));
      if (highlightKR) setHighlightedKRId(Number(highlightKR));

      if (objectives.length > 0) setExpandedObj(new Set(objectives.map(o => o.id)));

      setTimeout(() => {
        const objEl = document.querySelector('[data-highlight-obj="true"]');
        const krEl = document.querySelector('[data-highlight-kr="true"]');
        const initEl = document.querySelector('[data-highlight-init="true"]');
        
        if (objEl) {
          (objEl as HTMLElement).style.scrollMarginTop = '80px';
          objEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (krEl) {
          krEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (initEl) {
          initEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);

      const timer = setTimeout(() => {
        setHighlightedInitiativeId(null);
        setHighlightedObjId(null);
        setHighlightedKRId(null);
        setSearchParams({}, { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, objectives.length]);

  const toggleObj = (id: number) => {
    setExpandedObj(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const reorderMutation = useMutation({
    mutationFn: (orders: { id: number; sort_order: number }[]) => objectiveService.reorder(orders),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['objectives'] }); },
  });

  const handleDragStart = (_event: DragStartEvent) => {
    setExpandedObj(new Set());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = objectives.findIndex(o => o.id === active.id);
    const newIndex = objectives.findIndex(o => o.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(objectives, oldIndex, newIndex);
    const orders = reordered.map((o, i) => ({ id: o.id, sort_order: i }));
    reorderMutation.mutate(orders);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const closePanel = () => setPanel({ type: 'none' });

  return (
    <div className="max-w-full relative">

      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Objectives</h1>
            <p className="text-sm text-gray-500 mt-1">Kelola dan pantau objective untuk {selectedPeriod?.quarter} {selectedPeriod?.year}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
                title="Quarter sebelumnya"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              {periods.filter(p => p.year === (selectedPeriod?.year || new Date().getFullYear())).map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriodId(p.id)}
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
                title="Quarter berikutnya"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
            <button onClick={() => setPanel({ type: 'objective-create' })} className="px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors whitespace-nowrap flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              Buat Objective
            </button>
          </div>
        </div>
      </div>


      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[
          { value: 'ALL', label: 'Semua' },
          { value: 'PLANNING', label: 'Planning' },
          { value: 'ON_TRACK', label: 'On Track' },
          { value: 'AT_RISK', label: 'At Risk' },
          { value: 'OFF_TRACK', label: 'Off Track' },
          { value: 'DONE', label: 'Done' },
        ].map(f => (
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
            {f.value !== 'ALL' && (
              <span className="ml-1 text-[10px] opacity-70">
                {objectives.filter(o => o.status === f.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Context filter chips: Strategy / Segment / Division */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-5">
        <FilterChips value={contextFilter} onChange={setContextFilter} />
      </div>


      {(isLoading || isPeriodLoading) ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            <span className="text-sm">Memuat objectives...</span>
          </div>
        </div>
      ) : objectives.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-2xl">
          <div className="w-16 h-16 mx-auto bg-primary/5 rounded-full flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#194FBC" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Belum ada objective</h3>
          <p className="text-sm text-gray-500 mb-4">Mulai dengan membuat objective pertama.</p>
          <button onClick={() => setPanel({ type: 'objective-create' })} className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5">+ Buat Objective Pertama</button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredObjectives.map(o => o.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-8">
              {filteredObjectives.length === 0 ? (
                <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl">
                  <p className="text-sm text-gray-500">Tidak ada objective dengan status ini.</p>
                </div>
              ) : filteredObjectives.map((obj, idx) => (
                <SortableObjectiveCard key={obj.id} objective={obj} expanded={expandedObj.has(obj.id)}
                  number={idx + 1}
                  highlightedInitiativeId={highlightedInitiativeId}
                  highlightedObjId={highlightedObjId}
                  highlightedKRId={highlightedKRId}
                  onToggle={() => toggleObj(obj.id)}
                  onDetail={() => setPanel({ type: 'objective-edit', objective: obj })}
                  onAddKR={() => setPanel({ type: 'kr-create', objectiveId: obj.id })}
                  onClickKR={(kr) => setPanel({ type: 'kr-edit', keyResult: kr, objectiveId: obj.id })}
                  onAddInit={(krId) => setPanel({ type: 'initiative-create', keyResultId: krId })}
                  onAddChild={(krId, pid) => setPanel({ type: 'initiative-create', keyResultId: krId, parentId: pid })}
                  onClickInit={(init, krId) => setPanel({ type: 'initiative-edit', initiative: init, keyResultId: krId })} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}


      <DetailPanel open={panel.type !== 'none'} onClose={closePanel} title={getPanelTitle(panel)}>
        {panel.type === 'objective-create' && <ObjectivePanel periodId={activePeriodId!} onClose={closePanel} />}
        {panel.type === 'objective-edit' && <ObjectivePanel objective={panel.objective} periodId={activePeriodId!} onClose={closePanel} />}
        {panel.type === 'kr-create' && <KeyResultPanel objectiveId={panel.objectiveId} onClose={closePanel} />}
        {panel.type === 'kr-edit' && <KeyResultPanel keyResult={panel.keyResult} objectiveId={panel.objectiveId} onClose={closePanel} />}
        {panel.type === 'initiative-create' && <InitiativePanel keyResultId={panel.keyResultId} parentId={panel.parentId} onClose={closePanel} />}
        {panel.type === 'initiative-edit' && <InitiativePanel initiative={panel.initiative} keyResultId={panel.keyResultId} onClose={closePanel}
          onBack={panel.parentInitiative ? () => setPanel({ type: 'initiative-edit', initiative: panel.parentInitiative!, keyResultId: panel.keyResultId }) : undefined}
          onOpenChild={(child) => setPanel({ type: 'initiative-edit', initiative: child, keyResultId: panel.keyResultId, parentInitiative: panel.initiative })} />}
      </DetailPanel>
    </div>
  );
}

function getPanelTitle(p: PanelState): string {
  const t: Record<string, string> = { 'objective-create': 'Buat Objective', 'objective-edit': 'Detail Objective', 'kr-create': 'Buat Key Result', 'kr-edit': 'Detail Key Result', 'initiative-create': 'Buat Initiative', 'initiative-edit': 'Detail Initiative' };
  return t[p.type] || '';
}

function getDaysLeft(date: string): { label: string; color: string } {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: 'text-red-600 bg-red-50' };
  if (days === 0) return { label: 'Due today', color: 'text-red-600 bg-red-50' };
  if (days <= 7) return { label: `${days}d left`, color: 'text-amber-600 bg-amber-50' };
  return { label: `${days}d left`, color: 'text-gray-500 bg-gray-100' };
}

function SortableObjectiveCard(props: Parameters<typeof ObjectiveCard>[0] & { objective: Objective }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.objective.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' as any };

  return (
    <div ref={setNodeRef} style={style}>
      <ObjectiveCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function ObjectiveCard({ objective, expanded, onToggle, onDetail, onAddKR, onClickKR, onAddInit, onAddChild, onClickInit, number, dragHandleProps, highlightedInitiativeId, highlightedObjId, highlightedKRId }: {
  objective: Objective; expanded: boolean; onToggle: () => void; onDetail: () => void;
  onAddKR: () => void; onClickKR: (kr: KeyResult) => void;
  onAddInit: (krId: number) => void; onAddChild: (krId: number, pid: number) => void;
  onClickInit: (init: Initiative, krId: number) => void;
  number: number; dragHandleProps?: any; highlightedInitiativeId?: number | null;
  highlightedObjId?: number | null; highlightedKRId?: number | null;
}) {
  const pColor = objective.progress >= 70 ? 'from-emerald-400 to-emerald-500' : objective.progress >= 40 ? 'from-blue-400 to-blue-500' : 'from-gray-400 to-gray-500';
  const isHighlighted = highlightedObjId === objective.id;

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-colors group ${isHighlighted ? 'ring-2 ring-primary ring-offset-2 animate-pulse' : ''}`} data-highlight-obj={isHighlighted || undefined}>

      <div className={`h-1 ${objective.status === 'ON_TRACK' ? 'bg-blue-500' : objective.status === 'AT_RISK' ? 'bg-amber-500' : objective.status === 'OFF_TRACK' ? 'bg-red-500' : objective.status === 'DONE' ? 'bg-emerald-500' : 'bg-gray-300'}`} />


      <div className="p-4 md:p-5 cursor-pointer hover:bg-slate-50/80 transition-colors" onClick={onDetail}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="min-w-0 flex items-center gap-2">

            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity touch-none" title="Drag to reorder">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
            </div>
            <span className="text-[10px] font-bold text-gray-400">#{number}</span>
            <h3 className="text-base font-bold text-gray-900">{objective.title}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <OwnerAvatar owner={objective.owner} size={28} />
            <StatusBadge status={objective.status} />
          </div>
        </div>

        {/* Context badges */}
        <div className="mb-3">
          <ContextBadges
            strategy={objective.strategy}
            segment={objective.segment}
            division={objective.division}
          />
        </div>


        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${pColor} transition-all duration-700`} style={{ width: `${objective.progress}%` }} />
          </div>
          <span className="text-sm font-bold text-gray-800 w-10 text-right">{objective.progress.toFixed(0)}%</span>
        </div>
      </div>


      <div className="px-4 md:px-5 py-2.5 border-t border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors select-none" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 flex items-center justify-center text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6" /></svg>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#194FBC" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          <span className="text-sm font-semibold text-gray-700">Key Results</span>
          <KRCount objectiveId={objective.id} />
        </div>
        <button onClick={(e) => { e.stopPropagation(); onAddKR(); }} className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
          Tambah
        </button>
      </div>


      {expanded && (
        <div className="px-4 md:px-6 pb-5">
          <KRContent objectiveId={objective.id} onClickKR={onClickKR} onAddInit={onAddInit} onAddChild={onAddChild} onClickInit={onClickInit} highlightedInitiativeId={highlightedInitiativeId} highlightedKRId={highlightedKRId} />
        </div>
      )}
    </div>
  );
}

function KRContent({ objectiveId, onClickKR, onAddInit, onAddChild, onClickInit, highlightedInitiativeId, highlightedKRId }: {
  objectiveId: number; onClickKR: (kr: KeyResult) => void;
  onAddInit: (krId: number) => void; onAddChild: (krId: number, pid: number) => void;
  onClickInit: (init: Initiative, krId: number) => void;
  highlightedInitiativeId?: number | null; highlightedKRId?: number | null;
}) {
  const { data: krsRes } = useQuery({ queryKey: ['key-results', objectiveId], queryFn: () => keyResultService.getByObjective(objectiveId) });
  const krs: KeyResult[] = krsRes?.data?.data || [];

  if (krs.length === 0) return (
    <div className="text-center py-4 border border-dashed border-gray-200 rounded-xl bg-white">
      <p className="text-xs text-gray-400">Belum ada key result.</p>
    </div>
  );

  return (
    <div className="space-y-3 mt-3">{krs.map(kr => <KRCard key={kr.id} kr={kr} onClick={() => onClickKR(kr)} onAddInit={() => onAddInit(kr.id)} onAddChild={onAddChild} onClickInit={onClickInit} highlightedInitiativeId={highlightedInitiativeId} highlightedKRId={highlightedKRId} />)}</div>
  );
}

function KRCard({ kr, onClick, onAddInit, onAddChild, onClickInit, highlightedInitiativeId, highlightedKRId }: {
  kr: KeyResult; onClick: () => void; onAddInit: () => void;
  onAddChild: (krId: number, pid: number) => void; onClickInit: (init: Initiative, krId: number) => void;
  highlightedInitiativeId?: number | null; highlightedKRId?: number | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const isHighlighted = highlightedKRId === kr.id;
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isMilestone = (kr.kr_type || 'METRIC') === 'MILESTONE';

  const toggleMutation = useMutation({
    mutationFn: () => keyResultService.toggleMilestone(kr.id),
    onMutate: async () => {
      const queryKey = ['key-results', kr.objective_id];
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.data?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: old.data.data.map((k: KeyResult) =>
              k.id === kr.id
                ? { ...k, status: k.status === 'DONE' ? 'ON_TRACK' : 'DONE', progress: k.status === 'DONE' ? 0 : 100 }
                : k
            ),
          },
        };
      });
      return { prev };
    },
    onError: (err: any, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['key-results', kr.objective_id], ctx.prev);
      toast.error(err.response?.data?.message || 'Gagal mengubah milestone');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
    },
  });

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || user.id !== kr.created_by) {
      toast.error('Anda tidak punya izin untuk mengubah milestone ini');
      return;
    }
    toggleMutation.mutate();
  };

  // Compute due date label for milestone
  const getDueDateLabel = () => {
    if (!kr.due_date) return { text: 'No due date', color: 'text-gray-500' };
    if (kr.status === 'DONE') return { text: 'Completed', color: 'text-emerald-700' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(kr.due_date + 'T00:00:00');
    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `Overdue ${Math.abs(diffDays)} hari`, color: 'text-red-700' };
    if (diffDays === 0) return { text: 'Due today', color: 'text-amber-600' };
    return { text: `Due in ${diffDays} hari`, color: 'text-gray-600' };
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${isHighlighted ? 'ring-2 ring-primary ring-offset-1 animate-pulse' : ''}`} data-highlight-kr={isHighlighted || undefined}>
      <div className="p-3 md:p-4 cursor-pointer hover:bg-slate-50/80 transition-colors" onClick={onClick}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex items-center gap-2">
            {isMilestone && (
              <button
                type="button"
                onClick={handleToggle}
                className="shrink-0 cursor-pointer"
                title={kr.status === 'DONE' ? 'Mark as not done' : 'Mark as done'}
              >
                {kr.status === 'DONE' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#059669" stroke="#059669" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" stroke="white" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
                )}
              </button>
            )}
            <h5 className="font-semibold text-sm text-gray-900">{kr.title}</h5>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isMilestone ? (
              <span className="text-xs font-medium px-2 py-1 rounded bg-purple-50 text-purple-700">Milestone</span>
            ) : (
              <span className="text-xs font-semibold text-primary bg-primary/5 px-2 py-1 rounded">{kr.current_value}/{kr.target_value} {kr.metric_unit || ''}</span>
            )}
          </div>
        </div>

        {/* METRIC: progress bar */}
        {!isMilestone && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${kr.progress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${kr.progress}%` }} />
              </div>
              <span className="text-[11px] font-bold text-gray-600 w-7 text-right">{kr.progress.toFixed(0)}%</span>
            </div>
            {kr.progress === 0 && (
              <p className="text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg mt-3 flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                Update progress initiative untuk memajukan key result ini
              </p>
            )}
          </>
        )}

        {/* MILESTONE: due date label */}
        {isMilestone && (
          <div className="mt-1">
            {(() => {
              const label = getDueDateLabel();
              return <span className={`text-xs font-medium ${label.color}`}>{label.text}</span>;
            })()}
          </div>
        )}
      </div>

      <div className="px-3 md:px-4 py-2.5 border-t border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors select-none" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 flex items-center justify-center text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6" /></svg>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M6 3v18" /><path d="M6 9h12l-4-4" /><path d="M6 15h8l-4-4" /></svg>
          <span className="text-xs font-bold text-gray-700">Initiatives</span>
          <InitCount krId={kr.id} />
        </div>
        <button onClick={(e) => { e.stopPropagation(); onAddInit(); }} className="text-[11px] font-semibold text-primary hover:text-primary-hover flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-primary/5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
          Tambah
        </button>
      </div>
      {expanded && (
        <div className="px-3 md:px-4 pb-3">
          <InitContent krId={kr.id} onAddChild={onAddChild} onClickInit={onClickInit} highlightedInitiativeId={highlightedInitiativeId} />
        </div>
      )}
    </div>
  );
}

function InitContent({ krId, onAddChild, onClickInit, highlightedInitiativeId }: {
  krId: number;
  onAddChild: (krId: number, pid: number) => void; onClickInit: (init: Initiative, krId: number) => void;
  highlightedInitiativeId?: number | null;
}) {
  const [initFilter, setInitFilter] = useState<string>('ALL');
  const { data: treeRes } = useQuery({ queryKey: ['initiative-tree', krId], queryFn: () => initiativeService.getTree(krId) });
  const initiatives: Initiative[] = treeRes?.data?.data || [];

  const filteredTree = initFilter === 'ALL' ? initiatives : initFilter === 'NO_PIC' ? filterInitiativeTreeByPIC(initiatives) : filterInitiativeTree(initiatives, initFilter);
  const totalCount = countAllInitiatives(initiatives);

  return (
    <div className="mt-2">
      {totalCount > 3 && (
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          {['ALL', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'NO_PIC'].map(status => (
            <button
              key={status}
              onClick={() => setInitFilter(status)}
              className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-all ${
                initFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {status === 'ALL' ? 'All' : status === 'IN_PROGRESS' ? 'Progress' : status === 'NO_PIC' ? 'No PIC' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}
      {filteredTree.length === 0 && initiatives.length === 0 ? (
        <QuickAddInitiative krId={krId} />
      ) : filteredTree.length === 0 ? (
        <p className="text-[11px] text-gray-400 py-2">Tidak ada initiative dengan status ini.</p>
      ) : (
        <>
          {filteredTree.map((i, idx) => <InitNode key={i.id} init={i} depth={0} krId={krId} onAddChild={onAddChild} onClick={onClickInit} index={idx} highlightedId={highlightedInitiativeId} />)}
          <QuickAddInitiative krId={krId} />
        </>
      )}
    </div>
  );
}

function QuickAddInitiative({ krId }: { krId: number }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [focused, setFocused] = useState(false);

  const mutation = useMutation({
    mutationFn: () => initiativeService.create(krId, { title }),
    onSuccess: () => {
      setTitle('');
      setFocused(false);
      queryClient.invalidateQueries({ queryKey: ['initiative-tree', krId] });
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      toast.success('Initiative ditambahkan');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menambah initiative'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <div className={`flex items-center gap-2 rounded-lg transition-all ${focused ? 'bg-white border border-primary/30 shadow-sm' : 'bg-gray-50 border border-transparent hover:border-gray-200'}`}>
        <div className="pl-3 text-gray-300">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
        </div>
        <input
          type="text"
          placeholder="Tambah initiative baru..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { if (!title.trim()) setFocused(false); }}
          className="flex-1 py-2 pr-3 text-xs bg-transparent focus:outline-none placeholder:text-gray-400"
        />
        {title.trim() && (
          <button
            type="submit"
            disabled={mutation.isPending}
            className="mr-2 px-2.5 py-1 text-[10px] font-semibold text-white bg-primary rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? '...' : 'Tambah'}
          </button>
        )}
      </div>
    </form>
  );
}

function filterInitiativeTree(nodes: Initiative[], status: string): Initiative[] {
  return nodes.reduce<Initiative[]>((acc, node) => {
    const childrenFiltered = node.children ? filterInitiativeTree(node.children, status) : [];
    if (node.status === status || childrenFiltered.length > 0) {
      acc.push({ ...node, children: childrenFiltered.length > 0 ? childrenFiltered : node.children?.filter(c => c.status === status) });
    }
    return acc;
  }, []);
}

function filterInitiativeTreeByPIC(nodes: Initiative[]): Initiative[] {
  return nodes.reduce<Initiative[]>((acc, node) => {
    const childrenFiltered = node.children ? filterInitiativeTreeByPIC(node.children) : [];
    if (!node.assignee_id || childrenFiltered.length > 0) {
      acc.push({ ...node, children: childrenFiltered.length > 0 ? childrenFiltered : node.children?.filter(c => !c.assignee_id) });
    }
    return acc;
  }, []);
}

function countAllInitiatives(nodes: Initiative[]): number {
  return nodes.reduce((count, node) => count + 1 + (node.children ? countAllInitiatives(node.children) : 0), 0);
}

function InitNode({ init, depth, krId, onAddChild, onClick, highlightedId }: {
  init: Initiative; depth: number; krId: number;
  onAddChild: (krId: number, pid: number) => void; onClick: (init: Initiative, krId: number) => void;
  index?: number; highlightedId?: number | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = init.children && init.children.length > 0;
  const isLeaf = !hasChildren;
  const daysInfo = init.due_date ? getDaysLeft(init.due_date) : null;
  const isHighlighted = highlightedId === init.id;
  const isDone = init.status === 'DONE';
  const isCancelled = init.status === 'CANCELLED';
  const dimmed = isDone || isCancelled;

  return (
    <div className={depth > 0 ? 'ml-4 sm:ml-6 border-l-2 border-gray-200 pl-3 sm:pl-4' : ''}>
      <div
        className={`flex items-center gap-3 py-3 px-3 -mx-3 rounded-lg group hover:bg-blue-50/40 transition-colors cursor-pointer ${
          isHighlighted ? 'ring-2 ring-primary bg-primary/5 animate-pulse' : ''
        }`}
        data-highlight-init={isHighlighted || undefined}
        onClick={() => onClick(init, krId)}
      >
        {/* Left: expand button + status dot */}
        <div className="flex items-center gap-2 shrink-0">
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ) : (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className={`w-2.5 h-2.5 rounded-full ${
                isDone ? 'bg-emerald-500' :
                init.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                init.status === 'BLOCKED' ? 'bg-red-500' :
                isCancelled ? 'bg-gray-300' :
                'bg-gray-400'
              }`} />
            </div>
          )}
        </div>

        {/* Center: title (takes remaining space) */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-sm font-medium truncate ${
            isDone ? 'line-through text-gray-400' :
            isCancelled ? 'line-through text-gray-400' :
            'text-gray-800'
          }`}>
            {init.title}
          </span>
          {hasChildren && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">
              {init.children!.length}
            </span>
          )}
          {!hasChildren && <IStatusBadge status={init.status} />}
        </div>

        {/* Right: meta info — assignee, due date, progress */}
        <div className={`flex items-center gap-3 shrink-0 ${dimmed ? 'opacity-60' : ''}`}>
          {/* Due date */}
          {daysInfo && isLeaf && !dimmed && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full hidden md:inline ${daysInfo.color}`}>
              {daysInfo.label}
            </span>
          )}

          {/* Assignee */}
          <span className="hidden sm:block" onClick={(e) => e.stopPropagation()}>
            <InlineAssign initiativeId={init.id} assigneeId={init.assignee_id} />
          </span>

          {/* Progress */}
          <div className="flex items-center gap-2 min-w-[80px] sm:min-w-[100px]">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  init.progress >= 100 ? 'bg-emerald-500' :
                  init.progress >= 70 ? 'bg-emerald-400' :
                  'bg-primary'
                }`}
                style={{ width: `${init.progress}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-9 text-right tabular-nums">
              {init.progress.toFixed(0)}%
            </span>
          </div>

          {/* Add child button */}
          <button
            onClick={(e) => { e.stopPropagation(); onAddChild(krId, init.id); }}
            className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-primary hover:bg-primary/5 rounded opacity-0 group-hover:opacity-100 transition-all"
            title="Tambah sub-initiative"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>

      {isLeaf && !dimmed && (
        <InlineProgress initiative={init} />
      )}

      {expanded && hasChildren && (
        <div>
          {init.children!.map((c, idx) => (
            <InitNode key={c.id} init={c} depth={depth + 1} krId={krId} onAddChild={onAddChild} onClick={onClick} index={idx} highlightedId={highlightedId} />
          ))}
        </div>
      )}
    </div>
  );
}

function InlineProgress({ initiative }: { initiative: Initiative }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(initiative.progress);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setValue(initiative.progress); setDirty(false); }, [initiative.progress]);

  const mutation = useMutation({
    mutationFn: () => initiativeService.updateProgress(initiative.id, { progress: value }),
    onSuccess: () => {
      toast.success('Progress saved');
      queryClient.invalidateQueries({ queryKey: ['initiative-tree'] });
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      setDirty(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="ml-7 mb-1 flex items-center gap-2">
      <input type="range" min="0" max="100" value={value}
        onChange={(e) => { setValue(Number(e.target.value)); setDirty(true); }}
        className="flex-1 h-1.5 accent-primary max-w-[140px] cursor-pointer" />
      <span className="text-[10px] font-semibold text-gray-500 w-7">{value}%</span>
      {dirty && (
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="text-[10px] font-medium text-primary hover:underline">
          {mutation.isPending ? '...' : 'Save'}
        </button>
      )}
    </div>
  );
}

function InlineAssign({ initiativeId, assigneeId }: { initiativeId: number; assigneeId: number | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: usersRes } = useQuery({ queryKey: ['users'], queryFn: () => authService.getUsers() });
  const users = usersRes?.data?.data || [];
  const assignee = assigneeId ? users.find(u => u.id === assigneeId) : null;

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const mutation = useMutation({
    mutationFn: (userId: number | null) => initiativeService.update(initiativeId, { assignee_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiative-tree'] });
      toast.success('PIC diperbarui');
      setOpen(false);
    },
    onError: () => toast.error('Gagal assign'),
  });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 transition-all ${
          assignee ? 'bg-primary/80 text-white hover:ring-2 hover:ring-primary/30' : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
        }`}
        title={assignee ? assignee.name : 'Assign PIC'}
      >
        {assignee ? assignee.name.charAt(0).toUpperCase() : '?'}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-36 max-h-40 overflow-y-auto py-1">
          {assigneeId && (
            <button onClick={() => mutation.mutate(null)} className="w-full px-3 py-1.5 text-[11px] text-red-500 hover:bg-red-50 text-left">
              Hapus PIC
            </button>
          )}
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => mutation.mutate(u.id)}
              className={`w-full px-3 py-1.5 text-[11px] text-left flex items-center gap-2 transition-colors ${
                u.id === assigneeId ? 'bg-primary/5 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-primary/70 text-white text-[8px] flex items-center justify-center font-bold">{u.name.charAt(0).toUpperCase()}</div>
              {u.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KRCount({ objectiveId }: { objectiveId: number }) {
  const { data: krsRes } = useQuery({ queryKey: ['key-results', objectiveId], queryFn: () => keyResultService.getByObjective(objectiveId) });
  const count = krsRes?.data?.data?.length || 0;
  return <span className="text-[10px] text-gray-400 bg-gray-200/60 px-1.5 py-0.5 rounded-full font-medium">{count}</span>;
}

function InitCount({ krId }: { krId: number }) {
  const { data: treeRes } = useQuery({ queryKey: ['initiative-tree', krId], queryFn: () => initiativeService.getTree(krId) });
  const count = treeRes?.data?.data?.length || 0;
  return <span className="text-[10px] text-gray-400 bg-gray-200/60 px-1.5 py-0.5 rounded-full font-medium">{count}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { PLANNING: 'bg-gray-100 text-gray-600 border border-gray-200', ON_TRACK: 'bg-blue-50 text-blue-700 border border-blue-200', AT_RISK: 'bg-amber-50 text-amber-700 border border-amber-200', OFF_TRACK: 'bg-red-50 text-red-700 border border-red-200', DONE: 'bg-emerald-50 text-emerald-700 border border-emerald-200', ARCHIVED: 'bg-gray-50 text-gray-500 border border-gray-200' };
  const l: Record<string, string> = { PLANNING: 'planning', ON_TRACK: 'on track', AT_RISK: 'at risk', OFF_TRACK: 'off track', DONE: 'done', ARCHIVED: 'archived' };
  return <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${s[status] || s.PLANNING}`}>{l[status] || status}</span>;
}

function IStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = { TODO: 'bg-gray-100 text-gray-600', IN_PROGRESS: 'bg-blue-50 text-blue-600', BLOCKED: 'bg-red-50 text-red-600', DONE: 'bg-emerald-50 text-emerald-600', CANCELLED: 'bg-gray-50 text-gray-400' };
  const l: Record<string, string> = { TODO: 'todo', IN_PROGRESS: 'in progress', BLOCKED: 'blocked', DONE: 'done', CANCELLED: 'cancelled' };
  return <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${s[status] || s.TODO}`}>{l[status] || status}</span>;
}
