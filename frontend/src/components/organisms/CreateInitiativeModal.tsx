import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { initiativeService } from '../../services/initiative.service';
import { sprintService } from '../../services/sprint.service';
import { periodService } from '../../services/period.service';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  keyResultId: number;
  parentId?: number;
}

interface FormData {
  title: string;
  description: string;
  due_date: string;
  sprint_id: string;
}

export function CreateInitiativeModal({ open, onClose, keyResultId, parentId }: Props) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { title: '', description: '', due_date: '', sprint_id: '' },
  });


  const { data: currentPeriodRes } = useQuery({ queryKey: ['periods', 'current'], queryFn: () => periodService.getCurrent() });
  const periodId = currentPeriodRes?.data?.data?.id;
  const { data: sprintsRes } = useQuery({
    queryKey: ['sprints', periodId],
    queryFn: () => sprintService.getByPeriod(periodId!),
    enabled: !!periodId,
  });
  const sprints = sprintsRes?.data?.data || [];

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        due_date: data.due_date || undefined,
        sprint_id: data.sprint_id ? Number(data.sprint_id) : undefined,
      };

      if (parentId) {
        return initiativeService.createChild(parentId, payload);
      }
      return initiativeService.create(keyResultId, payload);
    },
    onSuccess: () => {
      toast.success(parentId ? 'Child initiative berhasil dibuat' : 'Initiative berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['initiative-tree'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      reset();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal membuat initiative');
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {parentId ? 'Tambah Child Initiative' : 'Tambah Initiative'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Judul <span className="text-red-500">*</span></label>
            <input
              {...register('title', { required: 'Judul wajib diisi' })}
              placeholder="Contoh: Implementasi fitur notifikasi"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
            <textarea
              {...register('description')}
              placeholder="Deskripsi initiative (opsional)"
              rows={2}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
              <input
                type="date"
                {...register('due_date')}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sprint</label>
              <select
                {...register('sprint_id')}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white"
              >
                <option value="">Tanpa sprint</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                ))}
              </select>
            </div>
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
