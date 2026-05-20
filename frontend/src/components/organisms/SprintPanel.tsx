import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintService } from '../../services/sprint.service';
import { Sprint, Period } from '../../types';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

interface Props {
  sprint?: Sprint;
  periodId: number;
  period: Period;
  onClose: () => void;
}

interface FormData {
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
}

export function SprintPanel({ sprint, periodId, period, onClose }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!sprint;
  const isCompleted = sprint?.status === 'COMPLETED';

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    defaultValues: {
      name: sprint?.name || '',
      goal: sprint?.goal || '',
      start_date: sprint?.start_date ? sprint.start_date.slice(0, 10) : '',
      end_date: sprint?.end_date ? sprint.end_date.slice(0, 10) : '',
    },
  });

  useEffect(() => {
    reset({
      name: sprint?.name || '',
      goal: sprint?.goal || '',
      start_date: sprint?.start_date ? sprint.start_date.slice(0, 10) : '',
      end_date: sprint?.end_date ? sprint.end_date.slice(0, 10) : '',
    });
  }, [sprint, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        goal: data.goal || undefined,
        start_date: data.start_date,
        end_date: data.end_date,
      };
      if (isEdit) {
        return sprintService.update(sprint!.id, payload);
      }
      return sprintService.create({ period_id: periodId, ...payload });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Sprint tersimpan' : 'Sprint dibuat');
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan sprint');
    },
  });

  const periodStart = period.start_date.slice(0, 10);
  const periodEnd = period.end_date.slice(0, 10);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded">
            SPRINT
          </span>
          {isEdit && (
            <span className="text-xs text-gray-400">#{sprint?.id}</span>
          )}
        </div>
        {sprint && <SprintStatusDot status={sprint.status} />}
      </div>

      {isCompleted && (
        <div className="mb-4 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
          <span>Sprint sudah selesai dan tidak dapat diedit lagi.</span>
        </div>
      )}

      <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Nama Sprint
          </label>
          <input
            {...register('name', { required: 'Nama wajib diisi', maxLength: { value: 100, message: 'Maksimal 100 karakter' } })}
            placeholder="Sprint 1"
            disabled={isCompleted}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* Goal */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Goal
          </label>
          <textarea
            {...register('goal')}
            rows={3}
            placeholder="Apa tujuan sprint ini? (opsional)"
            disabled={isCompleted}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Tanggal Mulai
            </label>
            <input
              type="date"
              min={periodStart}
              max={periodEnd}
              {...register('start_date', { required: 'Wajib diisi' })}
              disabled={isCompleted}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-gray-50"
            />
            {errors.start_date && <p className="mt-1 text-xs text-red-500">{errors.start_date.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Tanggal Selesai
            </label>
            <input
              type="date"
              min={periodStart}
              max={periodEnd}
              {...register('end_date', { required: 'Wajib diisi' })}
              disabled={isCompleted}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-gray-50"
            />
            {errors.end_date && <p className="mt-1 text-xs text-red-500">{errors.end_date.message}</p>}
          </div>
        </div>

        {/* Period range hint */}
        <div className="px-3 py-2 bg-blue-50/50 border border-blue-100 rounded-lg flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#194FBC" strokeWidth="2" className="mt-0.5 flex-shrink-0">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
          <p className="text-[11px] text-blue-800">
            Tanggal harus dalam range quarter <strong>{period.quarter} {period.year}</strong>: {formatDate(periodStart)} — {formatDate(periodEnd)}
          </p>
        </div>

        {/* Review/Retro notes (read-only for completed) */}
        {isCompleted && sprint?.review_note && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Review Note
            </label>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
              {sprint.review_note}
            </p>
          </div>
        )}
        {isCompleted && sprint?.retro_note && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Retro Note
            </label>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
              {sprint.retro_note}
            </p>
          </div>
        )}

        {/* Actions */}
        {!isCompleted && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending || (isEdit && !isDirty)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                isEdit && !isDirty
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-hover'
              }`}
            >
              {saveMutation.isPending ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Buat Sprint'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

function SprintStatusDot({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    PLANNING: { color: 'bg-gray-400', label: 'Planning' },
    ACTIVE: { color: 'bg-emerald-500', label: 'Active' },
    COMPLETED: { color: 'bg-blue-500', label: 'Completed' },
  };
  const c = config[status] || config.PLANNING;
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full ${c.color}`} />
      <span className="text-xs font-medium text-gray-600">{c.label}</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
