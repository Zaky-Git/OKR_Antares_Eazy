import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { keyResultService } from '../../services/keyResult.service';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  objectiveId: number;
}

interface FormData {
  title: string;
  description: string;
  target_value: string;
  current_value: string;
  metric_unit: string;
  confidence_level: number;
}

export function CreateKeyResultModal({ open, onClose, objectiveId }: Props) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { title: '', description: '', target_value: '100', current_value: '0', metric_unit: '', confidence_level: 5 },
  });

  const confidenceValue = watch('confidence_level');

  const mutation = useMutation({
    mutationFn: (data: FormData) => keyResultService.create(objectiveId, {
      title: data.title,
      description: data.description || undefined,
      target_value: Number(data.target_value),
      current_value: Number(data.current_value) || 0,
      metric_unit: data.metric_unit || undefined,
      confidence_level: Number(data.confidence_level),
    }),
    onSuccess: () => {
      toast.success('Key Result berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['key-results', objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      reset();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal membuat key result');
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Tambah Key Result</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Judul <span className="text-red-500">*</span></label>
            <input
              {...register('title', { required: 'Judul wajib diisi' })}
              placeholder="Contoh: Meningkatkan DAU dari 7,500 ke 10,000"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
            <textarea
              {...register('description')}
              placeholder="Deskripsi key result (opsional)"
              rows={2}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Value <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="any"
                {...register('target_value', { required: 'Target wajib diisi' })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              {errors.target_value && <p className="mt-1 text-xs text-red-500">{errors.target_value.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Value</label>
              <input
                type="number"
                step="any"
                {...register('current_value')}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Metric Unit</label>
            <input
              {...register('metric_unit')}
              placeholder="Contoh: users, %, bugs, revenue"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confidence Level: {confidenceValue}/10</label>
            <input
              type="range"
              min="0"
              max="10"
              {...register('confidence_level', { valueAsNumber: true })}
              className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary"
            />
            <p className="text-xs text-gray-400 mt-1">Seberapa yakin KR ini tercapai?</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50">
              {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
