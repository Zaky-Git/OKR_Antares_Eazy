import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintService } from '../../services/sprint.service';
import { SprintInitiative } from '../../types';
import { DraggableBacklogItem } from './SprintBoard';
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

const FILTER_STATUSES = ['ALL', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'] as const;

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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

  const filteredItems = useMemo(() => {
    let items = backlogItems;

    // Filter by status
    if (statusFilter !== 'ALL') {
      items = items.filter(i => i.status === statusFilter);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.objective_title && i.objective_title.toLowerCase().includes(q)) ||
        (i.key_result_title && i.key_result_title.toLowerCase().includes(q)) ||
        (i.parent_title && i.parent_title.toLowerCase().includes(q)) ||
        (i.assignee_name && i.assignee_name.toLowerCase().includes(q))
      );
    }

    return items;
  }, [backlogItems, statusFilter, search]);

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
    <div className="space-y-3">
      {/* Search + Filter */}
      <div className="space-y-2">
        <div className="flex gap-1 flex-wrap">
          {FILTER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'ALL' ? 'Semua' : STATUS_LABEL[s] || s}
            </button>
          ))}
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari initiative..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Count */}
      <p className="text-[11px] text-gray-400">
        {filteredItems.length} dari {backlogItems.length} initiative
      </p>

      {/* List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-400">Tidak ada initiative yang cocok</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
        <DraggableBacklogItem key={item.id} id={item.id}>
        <div
          className="bg-white border border-gray-200 rounded-xl p-3.5 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start gap-3">
            <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${STATUS_DOT_COLOR[item.status] || STATUS_DOT_COLOR.TODO}`} />

            <div className="flex-1 min-w-0">
              {/* Breadcrumb */}
              {(item.objective_title || item.key_result_title) && (
                <p className="text-[11px] text-gray-400 truncate mb-0.5">
                  <span className="text-gray-500 font-medium">OBJ</span> {item.objective_title}
                  {item.key_result_title && <><span className="text-gray-300"> › </span><span className="text-gray-500 font-medium">KR</span> {item.key_result_title}</>}
                  {item.parent_title && <><span className="text-gray-300"> › </span><span className="text-gray-500 font-medium">↳</span> {item.parent_title}</>}
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
        </DraggableBacklogItem>
      ))}
        </div>
      )}
    </div>
  );
}
