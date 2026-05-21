import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Modal } from '../atomics';
import { sprintService } from '../../services/sprint.service';
import { SprintInitiative } from '../../types';
import axios from 'axios';

interface CompleteSprintModalProps {
  open: boolean;
  onClose: () => void;
  sprintId: number;
  sprintName: string;
}

const STATUS_DOT_COLOR: Record<string, string> = {
  TODO: 'bg-gray-400',
  IN_PROGRESS: 'bg-indigo-500',
  BLOCKED: 'bg-red-500',
};

const STATUS_LABEL: Record<string, string> = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
};

export default function CompleteSprintModal({ open, onClose, sprintId, sprintName }: CompleteSprintModalProps) {
  const queryClient = useQueryClient();
  const [reviewNote, setReviewNote] = useState('');
  const [retroNote, setRetroNote] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [carryOverWarning, setCarryOverWarning] = useState<string | null>(null);

  const { data, isLoading: loadingInitiatives } = useQuery({
    queryKey: ['sprint-initiatives', sprintId],
    queryFn: () => sprintService.getSprintInitiatives(sprintId),
    enabled: open,
  });

  // Normalize response (could be array or grouped)
  const rawData = data?.data?.data;
  let allInitiatives: SprintInitiative[] = [];
  if (Array.isArray(rawData)) {
    allInitiatives = rawData;
  } else if (rawData && typeof rawData === 'object') {
    allInitiatives = Object.values(rawData).flat() as SprintInitiative[];
  }

  const incompleteInitiatives = allInitiatives.filter(
    (i) => i.status !== 'DONE' && i.status !== 'CANCELLED'
  );

  const completeMutation = useMutation({
    mutationFn: () => sprintService.complete(sprintId, { review_note: reviewNote || undefined, retro_note: retroNote || undefined }),
  });

  const carryOverMutation = useMutation({
    mutationFn: (ids: number[]) => sprintService.carryOverInitiatives(sprintId, { initiative_ids: ids }),
  });

  const handleToggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === incompleteInitiatives.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(incompleteInitiatives.map((i) => i.id));
    }
  };

  const handleSubmit = async () => {
    try {
      setCarryOverWarning(null);
      await completeMutation.mutateAsync();

      let carryOverMsg = '';
      if (selectedIds.length > 0) {
        try {
          const result = await carryOverMutation.mutateAsync(selectedIds);
          carryOverMsg = ` ${result.data.data.carried_count} initiative dipindah ke "${result.data.data.target_sprint_name}".`;
        } catch (err) {
          if (axios.isAxiosError(err) && err.response?.status === 422) {
            setCarryOverWarning('Sprint sudah selesai, tetapi tidak ada sprint PLANNING di quarter ini untuk carry-over. Silakan buat sprint baru lalu assign manual dari Backlog.');
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
            return;
          }
          throw err;
        }
      }

      toast.success(`Sprint berhasil diselesaikan.${carryOverMsg}`);
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      queryClient.invalidateQueries({ queryKey: ['sprint'] });
      queryClient.invalidateQueries({ queryKey: ['sprint-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['sprint-summary'] });
      queryClient.invalidateQueries({ queryKey: ['sprint-backlog'] });
      handleClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyelesaikan sprint');
    }
  };

  const handleClose = () => {
    setReviewNote('');
    setRetroNote('');
    setSelectedIds([]);
    setCarryOverWarning(null);
    onClose();
  };

  const isSubmitting = completeMutation.isPending || carryOverMutation.isPending;

  return (
    <Modal open={open} onClose={handleClose} title={`Selesaikan Sprint: ${sprintName}`} size="lg">
      <div className="space-y-5">
        {/* Review Note */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Review Note
          </label>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Apa yang berhasil diselesaikan di sprint ini?"
            rows={3}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
          />
        </div>

        {/* Retro Note */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Retro Note
          </label>
          <textarea
            value={retroNote}
            onChange={(e) => setRetroNote(e.target.value)}
            placeholder="Apa yang perlu diperbaiki di sprint berikutnya?"
            rows={3}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
          />
        </div>

        {/* Carry-over section */}
        {loadingInitiatives ? (
          <div className="flex items-center justify-center py-6">
            <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : incompleteInitiatives.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Carry-over Initiatives
                </label>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {incompleteInitiatives.length} initiative belum selesai. Pilih yang ingin dipindah ke sprint berikutnya.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-primary font-medium hover:underline"
              >
                {selectedIds.length === incompleteInitiatives.length ? 'Batal pilih' : 'Pilih semua'}
              </button>
            </div>
            <div className="border border-gray-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-gray-100">
              {incompleteInitiatives.map((initiative) => (
                <label
                  key={initiative.id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedIds.includes(initiative.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(initiative.id)}
                    onChange={() => handleToggle(initiative.id)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{initiative.title}</p>
                    {initiative.key_result_title && (
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {initiative.objective_title} <span className="text-gray-300">›</span> {initiative.key_result_title}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLOR[initiative.status] || 'bg-gray-400'}`} />
                    <span className="text-[10px] font-medium text-gray-600">
                      {STATUS_LABEL[initiative.status] || initiative.status}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            {selectedIds.length > 0 && (
              <p className="text-[11px] text-primary mt-2 flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {selectedIds.length} initiative akan dipindah ke sprint PLANNING berikutnya
              </p>
            )}
          </div>
        ) : allInitiatives.length > 0 ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" className="mt-0.5 flex-shrink-0">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className="text-sm text-emerald-800">
              Semua initiative sudah selesai. Sprint siap diselesaikan.
            </p>
          </div>
        ) : null}

        {/* Carry-over warning */}
        {carryOverWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="mt-0.5 flex-shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-sm text-amber-800">{carryOverWarning}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Selesaikan Sprint
          </button>
        </div>
      </div>
    </Modal>
  );
}
