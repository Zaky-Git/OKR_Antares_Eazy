import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { objectiveService } from '../../services/objective.service';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  periodId: number;
}

interface FormData {
  title: string;
  description: string;
}

export function CreateObjectiveModal({ open, onClose, periodId }: Props) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { title: '', description: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => objectiveService.create({
      period_id: periodId,
      title: data.title,
      description: data.description || undefined,
    }),
    onSuccess: () => {
      toast.success('Objective berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      reset();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal membuat objective');
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">

      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />


      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Buat Objective Baru</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>


        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="p-6 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Judul <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title', { required: 'Judul wajib diisi', maxLength: { value: 255, message: 'Maksimal 255 karakter' } })}
              placeholder="Contoh: Meningkatkan User Engagement"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
            <textarea
              {...register('description')}
              placeholder="Deskripsi objective (opsional)"
              rows={3}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors resize-none"
            />
          </div>


          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
