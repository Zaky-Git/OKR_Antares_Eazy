import { useMemo } from 'react';
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
  pointerWithin,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import type { Modifier } from '@dnd-kit/core';
import toast from 'react-hot-toast';
import { useState } from 'react';

// Snap drag overlay center to cursor position (works for any sized source element)
const snapCenterToCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (!draggingNodeRect || !activatorEvent) return transform;
  const event = activatorEvent as PointerEvent | MouseEvent;
  let clientX: number;
  let clientY: number;
  if ('clientX' in event && typeof event.clientX === 'number') {
    clientX = event.clientX;
    clientY = event.clientY;
  } else {
    return transform;
  }
  const offsetX = clientX - draggingNodeRect.left;
  const offsetY = clientY - draggingNodeRect.top;
  return {
    ...transform,
    x: transform.x + offsetX - draggingNodeRect.width / 2,
    y: transform.y + offsetY - draggingNodeRect.height / 2,
  };
};

interface Props {
  sprintId: number;
  onInitiativeClick?: (initiative: SprintInitiative) => void;
  /** Backlog items — rendered as draggable below the board within the same DndContext */
  backlogNode?: React.ReactNode;
  backlogItems?: SprintInitiative[];
}

export const STATUS_COLUMNS = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'] as const;
export type StatusKey = typeof STATUS_COLUMNS[number];

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

export function SprintBoard({ sprintId, onInitiativeClick, backlogNode, backlogItems = [] }: Props) {
  const queryClient = useQueryClient();
  const [activeItem, setActiveItem] = useState<SprintInitiative | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sprint-initiatives', sprintId],
    queryFn: () => sprintService.getSprintInitiatives(sprintId),
  });

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
      queryClient.invalidateQueries({ queryKey: ['sprint-backlog', sprintId] });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (initiativeId: number) =>
      sprintService.unassignInitiativeFromSprint(initiativeId),
    onSuccess: () => {
      toast.success('Initiative dikeluarkan dari sprint');
      queryClient.invalidateQueries({ queryKey: ['sprint-initiatives', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-summary', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprint-backlog', sprintId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal mengeluarkan initiative');
    },
  });

  const handleRemoveFromSprint = (initiative: SprintInitiative) => {
    unassignMutation.mutate(initiative.id);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Track if drag source is from backlog (wider element) to snap overlay to cursor
  const handleDragStart = (event: DragStartEvent) => {
    const rawId = String(event.active.id);
    const isBacklog = rawId.startsWith('backlog-');
    const numId = isBacklog ? Number(rawId.replace('backlog-', '')) : Number(rawId);

    if (isBacklog) {
      const found = backlogItems.find((i) => i.id === numId);
      if (found) setActiveItem(found);
    } else {
      const found = initiatives.find((i) => i.id === numId);
      if (found) setActiveItem(found);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const rawId = String(active.id);
    const isBacklog = rawId.startsWith('backlog-');
    const initiativeId = isBacklog ? Number(rawId.replace('backlog-', '')) : Number(rawId);
    const targetStatus = String(over.id) as StatusKey;
    if (!STATUS_COLUMNS.includes(targetStatus)) return;

    if (isBacklog) {
      // Backlog item → assign to sprint + set status
      sprintService.assignInitiativeToSprint(initiativeId, { sprint_id: sprintId }).then(() => {
        if (targetStatus !== 'TODO') {
          return initiativeService.update(initiativeId, { status: targetStatus });
        }
      }).then(() => {
        toast.success('Initiative di-assign ke sprint');
        queryClient.invalidateQueries({ queryKey: ['sprint-initiatives', sprintId] });
        queryClient.invalidateQueries({ queryKey: ['sprint-summary', sprintId] });
        queryClient.invalidateQueries({ queryKey: ['sprint-backlog', sprintId] });
      }).catch((err: any) => {
        toast.error(err?.response?.data?.message || 'Gagal assign initiative');
      });
    } else {
      // Board item → just change status
      const initiative = initiatives.find((i) => i.id === initiativeId);
      if (!initiative || initiative.status === targetStatus) return;
      updateStatusMutation.mutate({ id: initiativeId, status: targetStatus });
    }
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

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      {/* Board columns */}
      {initiatives.length === 0 && backlogItems.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {STATUS_COLUMNS.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              items={grouped[status]}
              onInitiativeClick={onInitiativeClick}
              onRemoveFromSprint={handleRemoveFromSprint}
              isDragActive={!!activeItem}
            />
          ))}
        </div>
      )}

      {/* Backlog section (inside same DndContext so drag works) */}
      {backlogNode}

      <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
        {activeItem ? (
          <div className="opacity-95 shadow-xl w-[220px]">
            <InitiativeCard initiative={activeItem} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// --- Board Column ---

interface BoardColumnProps {
  status: StatusKey;
  items: SprintInitiative[];
  onInitiativeClick?: (initiative: SprintInitiative) => void;
  onRemoveFromSprint: (initiative: SprintInitiative) => void;
  isDragActive: boolean;
}

function BoardColumn({ status, items, onInitiativeClick, onRemoveFromSprint, isDragActive }: BoardColumnProps) {
  const config = COLUMN_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
          <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">{config.label}</h4>
        </div>
        <span className="text-[10px] font-semibold text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5 min-w-[22px] text-center">
          {items.length}
        </span>
      </div>

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
              onRemoveFromSprint={onRemoveFromSprint}
            />
          ))
        )}
      </div>
    </div>
  );
}

// --- Draggable Initiative (board cards) ---

function DraggableInitiative({ initiative, onClick, onRemoveFromSprint }: { initiative: SprintInitiative; onClick?: (i: SprintInitiative) => void; onRemoveFromSprint: (i: SprintInitiative) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: initiative.id });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`touch-none ${isDragging ? 'opacity-30' : ''}`}>
      <InitiativeCard initiative={initiative} onClick={onClick || (() => {})} onRemoveFromSprint={onRemoveFromSprint} />
    </div>
  );
}

// --- Draggable Backlog Item (exported for use in BacklogPanel) ---
export function DraggableBacklogItem({ id, children }: { id: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `backlog-${id}` });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`touch-none cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30 scale-[0.98]' : ''} transition-all`}>
      {children}
    </div>
  );
}
