import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { keyResultService } from '../../services/keyResult.service';
import { KeyResult } from '../../types';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

interface Props {
  keyResult?: KeyResult | null;
  objectiveId: number;
  onClose: () => void;
}

interface FormData {
  title: string;
  description: string;
  kr_type: string;
  target_value: string;
  current_value: string;
  baseline_value: string;
  metric_unit: string;
  due_date: string;
  done: boolean;
  notes: string;
}

export function KeyResultPanel({ keyResult, objectiveId, onClose }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!keyResult;

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      title: keyResult?.title || '',
      description: keyResult?.description || '',
      kr_type: keyResult?.kr_type || 'METRIC',
      target_value: String(keyResult?.target_value || 100),
      current_value: String(keyResult?.current_value || 0),
      baseline_value: String(keyResult?.baseline_value || 0),
      metric_unit: keyResult?.metric_unit || '',
      due_date: keyResult?.due_date || '',
      done: keyResult?.status === 'DONE',
      notes: keyResult?.notes || '',
    },
  });

  const krType = useWatch({ control, name: 'kr_type' });
  const notes = useWatch({ control, name: 'notes' });
  const notesLength = (notes || '').length;
  const notesExceeded = notesLength > 5000;

  useEffect(() => {
    reset({
      title: keyResult?.title || '',
      description: keyResult?.description || '',
      kr_type: keyResult?.kr_type || 'METRIC',
      target_value: String(keyResult?.target_value || 100),
      current_value: String(keyResult?.current_value || 0),
      baseline_value: String(keyResult?.baseline_value || 0),
      metric_unit: keyResult?.metric_unit || '',
      due_date: keyResult?.due_date || '',
      done: keyResult?.status === 'DONE',
      notes: keyResult?.notes || '',
    });
  }, [keyResult, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: Record<string, unknown> = {
        title: data.title,
        description: data.description || undefined,
        kr_type: data.kr_type,
        notes: data.notes.trim() || null,
      };
      if (data.kr_type === 'METRIC') {
        payload.target_value = Number(data.target_value);
        payload.current_value = Number(data.current_value) || 0;
        payload.baseline_value = Number(data.baseline_value) || 0;
        payload.metric_unit = data.metric_unit || undefined;
      } else {
        // MILESTONE
        payload.due_date = data.due_date || null;
        payload.status = data.done ? 'DONE' : (isEdit ? (keyResult!.status === 'DONE' && !data.done ? 'ON_TRACK' : keyResult!.status) : 'PLANNING');
        if (data.done) payload.status = 'DONE';
        else if (isEdit && keyResult!.status === 'DONE') payload.status = 'ON_TRACK';
      }
      if (isEdit) return keyResultService.update(keyResult!.id, payload as any);
      return keyResultService.create(objectiveId, payload as any);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Key Result diperbarui' : 'Key Result dibuat');
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      if (!isEdit) onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menyimpan'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => keyResultService.delete(keyResult!.id),
    onSuccess: () => {
      toast.success('Key Result dihapus');
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menghapus'),
  });

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-2 mb-5">
        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[11px] font-semibold rounded">KEY RESULT</span>
        {isEdit && <span className="text-xs text-gray-400">#{keyResult?.id}</span>}
      </div>

      {isEdit && (
        <div className="bg-gray-50 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Progress</span>
            <span className="text-lg font-bold text-gray-900">{keyResult?.progress.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${keyResult?.progress || 0}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Auto-calculated dari initiatives</p>
        </div>
      )}

      <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Judul</label>
          <input {...register('title', { required: 'Wajib diisi' })} placeholder={krType === 'MILESTONE' ? 'Contoh: Delivery VMS production' : 'Contoh: Meningkatkan DAU dari 7,500 ke 10,000'} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Deskripsi</label>
          <textarea {...register('description')} rows={2} placeholder="Opsional" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none" />
        </div>

        {/* Type Radio Group */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tipe</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="METRIC" {...register('kr_type')} className="w-4 h-4 text-primary border-gray-300 focus:ring-primary" />
              <span className="text-sm font-medium text-gray-700">Metric</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="MILESTONE" {...register('kr_type')} className="w-4 h-4 text-primary border-gray-300 focus:ring-primary" />
              <span className="text-sm font-medium text-gray-700">Milestone</span>
            </label>
          </div>
        </div>

        {/* METRIC fields */}
        <div className={krType === 'METRIC' ? '' : 'hidden'}>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Baseline</label>
              <input type="number" step="any" {...register('baseline_value')} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Target</label>
              <input type="number" step="any" {...register('target_value', { required: krType === 'METRIC' ? 'Wajib' : false })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Current</label>
              <input type="number" step="any" {...register('current_value')} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Metric Unit</label>
            <input {...register('metric_unit')} placeholder="users, %, bugs, revenue" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </div>
        </div>

        {/* MILESTONE fields */}
        <div className={krType === 'MILESTONE' ? '' : 'hidden'}>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</label>
            <input type="date" {...register('due_date')} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('done')} className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
              <span className="text-sm font-medium text-gray-700">Selesai</span>
            </label>
          </div>
        </div>

        {/* Notes - always visible */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes</label>
          <textarea {...register('notes')} rows={3} placeholder="Catatan tambahan (opsional)" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none" />
          <div className={`text-right text-[11px] mt-1 ${notesExceeded ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
            {notesLength}/5000
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {isEdit ? (
            <button type="button" onClick={() => { if (confirm('Hapus key result ini?')) deleteMutation.mutate(); }} className="text-xs text-red-500 hover:text-red-700 font-medium">Hapus</button>
          ) : <span />}
          <button type="submit" disabled={saveMutation.isPending || notesExceeded} className="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors">
            {saveMutation.isPending ? '...' : isEdit ? 'Perbarui' : 'Buat Key Result'}
          </button>
        </div>
      </form>
    </div>
  );
}
