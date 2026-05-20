import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { objectiveService } from '../../services/objective.service';
import { Objective } from '../../types';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

interface Props {
  objective?: Objective | null;
  periodId: number;
  onClose: () => void;
}

interface FormData {
  title: string;
  description: string;
  status: string;
}

export function ObjectivePanel({ objective, periodId, onClose }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!objective;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<FormData>({
    defaultValues: { title: objective?.title || '', description: objective?.description || '', status: objective?.status || 'PLANNING' },
  });

  useEffect(() => {
    reset({ title: objective?.title || '', description: objective?.description || '', status: objective?.status || 'PLANNING' });
  }, [objective, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (isEdit) {
        return objectiveService.update(objective!.id, { title: data.title, description: data.description || null, status: data.status } as any);
      }
      return objectiveService.create({ period_id: periodId, title: data.title, description: data.description || undefined });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Tersimpan' : 'Objective dibuat');
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (!isEdit) onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => objectiveService.delete(objective!.id),
    onSuccess: () => {
      toast.success('Objective dihapus');
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal'),
  });

  const currentStatus = watch('status');

  return (
    <div>

      <div className="flex items-center gap-2 mb-5">
        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-semibold rounded">OBJECTIVE</span>
        {isEdit && <span className="text-xs text-gray-400">#{objective?.id}</span>}
      </div>


      {isEdit && (
        <div className="bg-gray-50 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Progress</span>
            <span className="text-lg font-bold text-gray-900">{objective?.progress.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${objective!.progress >= 70 ? 'bg-emerald-500' : objective!.progress >= 40 ? 'bg-primary' : 'bg-gray-400'}`} style={{ width: `${objective?.progress}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Auto-calculated dari Key Results</p>
        </div>
      )}

      <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Judul</label>
          <input
            {...register('title', { required: 'Judul wajib diisi', maxLength: { value: 255, message: 'Maksimal 255 karakter' } })}
            placeholder="Contoh: Meningkatkan User Engagement"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>


        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Deskripsi</label>
          <textarea
            {...register('description')}
            placeholder="Deskripsi objective (opsional)"
            rows={3}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
          />
        </div>


        {isEdit && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: 'PLANNING', label: 'Planning', color: 'gray' },
                { value: 'ON_TRACK', label: 'On Track', color: 'blue' },
                { value: 'AT_RISK', label: 'At Risk', color: 'amber' },
                { value: 'OFF_TRACK', label: 'Off Track', color: 'red' },
                { value: 'DONE', label: 'Done', color: 'emerald' },
                { value: 'ARCHIVED', label: 'Archived', color: 'gray' },
              ].map(s => (
                <button key={s.value} type="button" onClick={() => setValue('status', s.value, { shouldDirty: true })}
                  className={`px-2 py-2 text-[11px] font-medium rounded-lg border transition-colors ${
                    currentStatus === s.value
                      ? s.color === 'emerald' ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : s.color === 'amber' ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : s.color === 'red' ? 'border-red-400 bg-red-50 text-red-700'
                      : s.color === 'blue' ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-400 bg-gray-100 text-gray-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}


        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {isEdit ? (
            <button type="button" onClick={() => { if (confirm('Hapus objective ini beserta semua Key Results dan Initiatives?')) deleteMutation.mutate(); }} className="text-xs text-red-500 hover:text-red-700 font-medium">
              Hapus Objective
            </button>
          ) : <span />}
          <button type="submit" disabled={saveMutation.isPending || (isEdit && !isDirty)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              isEdit && !isDirty
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-hover'
            }`}>
            {saveMutation.isPending ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Buat Objective'}
          </button>
        </div>
      </form>
    </div>
  );
}
