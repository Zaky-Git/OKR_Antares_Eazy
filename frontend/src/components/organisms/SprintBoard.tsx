import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintService } from '../../services/sprint.service';
import { initiativeService } from '../../services/initiative.service';
import { SprintInitiative } from '../../types';
import { InitiativeCard } from './InitiativeCard';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import toast from 'react-hot-toast';

interface Props {
  sprintId: number;
  onInitiativeClick?: (initiative: SprintInitiative) => void;
}

const STATUS_COLUMNS = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'] as const;
type StatusKey = typeof STATUS_COLUMNS[number];

const COLUMN_CONFIG: Record<StatusKey, { label: string; dotColor: string; ringColor: string }> = {
  TODO: { label: 'To Do', dotColor: 'bg-gray-400', ringColor: 'ring-gray-300' },
  IN_PROGRESS: { label: 'In Progress', dotColor: 'bg-indigo-500', ringColor: 'ring-indigo-300' },
  BLOCKED: { label: 'Blocked', dotColor: 'bg-red-500', ringColor: 'ring-red-300' },
  DONE: { label: 'Done', dotColor: 'bg-blue-500', ringColor: 'ring-blue-300' },
  CANCELLED: { label: 'Cancelled', dotColor: 'bg-gray-300', ringColor: 'ring-gray-200' },
};

function groupByStatus(initiatives: SprintInitiative[]): Record<StatusKey, SprintInitiative[]> {
  const grouped = {
    TODO: [], IN_PROGRESS: [], BLOCKED: [], DONE: [], CANCELLED: [],
  } as Record<StatusKey, SprintInitiative[]>;
  for (const initiative of initiatives) {
    const key = initiative.status as StatusKey;
    if (grouped[key]) grouped[key].push(initiative);
    else grouped.TODO.push(initiative);
  }
  return grouped;
}

export function SprintBoard({ sprintId, onInitiativeClick }: Props) {
  const queryClient = useQueryClient();
  const [activeInitiative, setActiveInitiative] = useState<SprintInitiative | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sprint-initiatives', sprintId],
    queryFn: () => sprintService.getSprintInitiatives(sprintId),
  });

  // Normalize response (could be array or grouped)
  const initiatives: SprintInitiative[] = useMemo(() => {
    const rawData = data?.data?.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData && typeof rawData === 'object') {
      return Object.values(rawData).flat() as SprintInitiative[];
    }
    return [];
  }, [data]);

  const grouped = useMemo(() => groupByStatus(initiatives), [initiatives]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      initiativeService.update(id, { status }),
    onMutate: async ({ id, status }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['sprint-initiatives', sprintId] });
      const previous = queryClient.getQueryData<any>(['sprint-initiatives', sprintId]);
      queryClient.setQueryData(['sprint-initiatives', sprintId], (old: any) => {
        if (!old) return old;
        const oldData = old.data?.data;
        const updateInArray = (arr: SprintInitiative[]) =>
          arr.map((it) => (it.id === id ? { ...it, status } : it));
        if (Array.isArray(oldData)) {
          return { ...old, data: { ...old.data, data: updateInArray(oldData) } };
        }
        return old;
      });
      return { previous };
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['sprint-initiatives', sprintId], ctx.previous);
      }
      toast.error(err?.response?.data?.message || 'Gagal mengubah status');
    },
    onSuccess: () => {
      toast.success('Status berhasil diubah');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['sprint-initiatives', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-summary', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['initiative-tree'] });
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = Number(event.active.id);
    const found = initiatives.find((i) => i.id === id);
    if (found) setActiveInitiative(found);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveInitiative(null);
    const { active, over } = event;
    if (!over) return;

    const initiativeId = Number(active.id);
    const targetStatus = String(over.id) as StatusKey;
    const initiative = initiatives.find((i) => i.id === initiativeId);
    if (!initiative || initiative.status === targetStatus) return;
    if (!STATUS_COLUMNS.includes(targetStatus)) return;

    updateStatusMutation.mutate({ id: initiativeId, status: targetStatus });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Memuat board...</span>
        </div>
      </div>
    );
  }

  if (initiatives.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl">
        <div className="w-14 h-14 mx-auto bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Belum ada initiative</h3>
        <p className="text-xs text-gray-500 max-w-xs mx-auto">
          Assign initiative dari halaman Objectives, atau dari panel Backlog di bawah.
        </p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {STATUS_COLUMNS.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            items={grouped[status]}
            onInitiativeClick={onInitiativeClick}
            isDragActive={!!activeInitiative}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeInitiative ? (
          <div className="rotate-2 opacity-95 shadow-lg">
            <InitiativeCard initiative={activeInitiative} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface BoardColumnProps {
  status: StatusKey;
  items: SprintInitiative[];
  onInitiativeClick?: (initiative: SprintInitiative) => void;
  isDragActive: boolean;
}

function BoardColumn({ status, items, onInitiativeClick, isDragActive }: BoardColumnProps) {
  const config = COLUMN_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col">
      {/* Column header */}
      <div className="flex items-center justify-between px-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
          <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">{config.label}</h4>
        </div>
        <span className="text-[10px] font-semibold text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5 min-w-[22px] text-center">
          {items.length}
        </span>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2 min-h-[160px] transition-colors border ${
          isOver
            ? `bg-primary/5 border-primary/40 border-dashed ring-2 ${config.ringColor}`
            : isDragActive
              ? 'bg-gray-50/70 border-gray-200 border-dashed'
              : 'bg-gray-50/70 border-gray-100'
        }`}
      >
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full py-6">
            <p className="text-[11px] text-gray-300 italic">
              {isOver ? 'Drop di sini' : 'Kosong'}
            </p>
          </div>
        ) : (
          items.map((initiative) => (
            <DraggableInitiative
              key={initiative.id}
              initiative={initiative}
              onClick={onInitiativeClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface DraggableInitiativeProps {
  initiative: SprintInitiative;
  onClick?: (initiative: SprintInitiative) => void;
}

function DraggableInitiative({ initiative, onClick }: DraggableInitiativeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: initiative.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`touch-none ${isDragging ? 'opacity-30' : ''}`}
    >
      <InitiativeCard initiative={initiative} onClick={onClick || (() => {})} />
    </div>
  );
}
