import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { objectiveService } from '../../services/objective.service';
import { authService } from '../../services/auth.service';
import { strategiesApi, segmentsApi, divisionsApi } from '../../services/master.service';
import { Objective, User } from '../../types';
import { Strategy, Segment, Division } from '../../types/master';
import toast from 'react-hot-toast';
import { useEffect, useState, useRef } from 'react';
import Dropdown from '../atomics/Dropdown';
import { ConfirmDialog } from '../atomics';

interface Props {
  objective?: Objective | null;
  periodId: number;
  onClose: () => void;
}

interface FormData {
  title: string;
  description: string;
  status: string;
  strategy_id: string;
  segment_id: string;
  division_id: string;
  owner_id: string;
  notes: string;
}

const NOTES_MAX = 5000;

export function ObjectivePanel({ objective, periodId, onClose }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!objective;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<FormData>({
    defaultValues: getDefaults(objective),
  });

  useEffect(() => {
    reset(getDefaults(objective));
  }, [objective, reset]);

  // Master data fetches
  const { data: stratRes } = useQuery({
    queryKey: ['masters', 'strategies'],
    queryFn: () => strategiesApi.list(),
  });
  const { data: segRes } = useQuery({
    queryKey: ['masters', 'segments'],
    queryFn: () => segmentsApi.list(),
  });
  const { data: divRes } = useQuery({
    queryKey: ['masters', 'divisions'],
    queryFn: () => divisionsApi.list(),
  });
  const { data: usersRes } = useQuery({
    queryKey: ['users'],
    queryFn: () => authService.getUsers(),
  });

  const strategies: Strategy[] = (stratRes?.data?.data || []).filter((s) => s.is_active);
  const segments: Segment[] = (segRes?.data?.data || []).filter((s) => s.is_active);
  const divisions: Division[] = (divRes?.data?.data || []).filter((d) => d.is_active);
  const users: User[] = usersRes?.data?.data || [];

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const trimmedNotes = data.notes.trim();
      const payload = {
        title: data.title,
        description: data.description || null,
        strategy_id: data.strategy_id ? Number(data.strategy_id) : null,
        segment_id: data.segment_id ? Number(data.segment_id) : null,
        division_id: data.division_id ? Number(data.division_id) : null,
        owner_id: data.owner_id ? Number(data.owner_id) : null,
        notes: trimmedNotes || null,
      };
      if (isEdit) {
        return objectiveService.update(objective!.id, { ...payload, status: data.status } as any);
      }
      return objectiveService.create({
        period_id: periodId,
        title: data.title,
        description: data.description || undefined,
        strategy_id: payload.strategy_id ?? undefined,
        segment_id: payload.segment_id ?? undefined,
        division_id: payload.division_id ?? undefined,
        owner_id: payload.owner_id ?? undefined,
        notes: trimmedNotes || undefined,
      });
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
  const notesValue = watch('notes') || '';
  const notesTooLong = notesValue.length > NOTES_MAX;

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
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Judul *</label>
          <input
            {...register('title', { required: 'Judul wajib diisi', maxLength: { value: 255, message: 'Maksimal 255 karakter' } })}
            placeholder="Contoh: Meningkatkan User Engagement"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Deskripsi</label>
          <textarea
            {...register('description')}
            placeholder="Deskripsi objective (opsional)"
            rows={3}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
          />
        </div>

        {/* Context: Strategy + Segment */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Dropdown
              label="Strategy"
              options={[
                { value: '', label: 'Tidak dipilih' },
                ...[...strategies]
                  .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
                  .map((s) => ({ value: String(s.id), label: s.name }))
              ]}
              value={watch('strategy_id')}
              onChange={(v) => setValue('strategy_id', String(v), { shouldDirty: true })}
              placeholder="Tidak dipilih"
            />
          </div>
          <div>
            <Dropdown
              label="Segment"
              options={[
                { value: '', label: 'Tidak dipilih' },
                ...[...segments]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((s) => ({ value: String(s.id), label: s.name }))
              ]}
              value={watch('segment_id')}
              onChange={(v) => setValue('segment_id', String(v), { shouldDirty: true })}
              placeholder="Tidak dipilih"
            />
          </div>
        </div>

        {/* Context: Division + Owner */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Dropdown
              label="Divisi"
              options={[
                { value: '', label: 'Tidak dipilih' },
                ...[...divisions]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((d) => ({ value: String(d.id), label: `${d.name} (${d.code})` }))
              ]}
              value={watch('division_id')}
              onChange={(v) => setValue('division_id', String(v), { shouldDirty: true })}
              placeholder="Tidak dipilih"
            />
          </div>
          <div>
            <OwnerSelector value={watch('owner_id')} onChange={(val) => setValue('owner_id', val, { shouldDirty: true })} users={users} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</label>
            <span className={`text-[10px] ${notesTooLong ? 'text-red-500' : 'text-gray-400'}`}>
              {notesValue.length}/{NOTES_MAX}
            </span>
          </div>
          <textarea
            {...register('notes', { maxLength: { value: NOTES_MAX, message: `Maksimal ${NOTES_MAX} karakter` } })}
            placeholder="Catatan, feedback, atau konteks tambahan (opsional)"
            rows={3}
            className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none ${
              notesTooLong ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 focus:border-primary focus:ring-primary/10'
            }`}
          />
          {errors.notes && <p className="mt-1 text-xs text-red-500">{errors.notes.message}</p>}
        </div>

        {/* Status (edit mode only) */}
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
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs text-red-500 hover:text-red-700 font-medium">
              Hapus Objective
            </button>
          ) : <span />}
          <button type="submit" disabled={saveMutation.isPending || notesTooLong || (isEdit && !isDirty)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              (isEdit && !isDirty) || notesTooLong
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-hover'
            }`}>
            {saveMutation.isPending ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Buat Objective'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus Objective?"
        message="Objective ini beserta semua Key Results dan Initiatives di dalamnya akan dihapus permanen."
        confirmLabel="Hapus"
        onConfirm={() => { setConfirmDelete(false); deleteMutation.mutate(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function getDefaults(objective?: Objective | null): FormData {
  return {
    title: objective?.title || '',
    description: objective?.description || '',
    status: objective?.status || 'PLANNING',
    strategy_id: objective?.strategy_id ? String(objective.strategy_id) : '',
    segment_id: objective?.segment_id ? String(objective.segment_id) : '',
    division_id: objective?.division_id ? String(objective.division_id) : '',
    owner_id: objective?.owner_id ? String(objective.owner_id) : '',
    notes: objective?.notes || '',
  };
}

function OwnerSelector({ value, onChange, users }: { value: string; onChange: (val: string) => void; users: User[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = users.find(u => String(u.id) === value);

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Owner (PIC)</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-left hover:border-gray-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
      >
        {selected ? (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">
              {selected.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-gray-900 text-sm">{selected.name}</span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">Pilih owner...</span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div
            onClick={() => { onChange(''); setOpen(false); }}
            className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2.5 ${!value ? 'bg-primary/5' : ''}`}
          >
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8" />
              </svg>
            </div>
            <span className="text-gray-500">Tidak dipilih</span>
          </div>
          {[...users].sort((a, b) => a.name.localeCompare(b.name)).map(u => (
            <div
              key={u.id}
              onClick={() => { onChange(String(u.id)); setOpen(false); }}
              className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2.5 ${String(u.id) === value ? 'bg-primary/5' : ''}`}
            >
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="font-medium text-gray-900">{u.name}</span>
                <span className="text-gray-400 text-[11px] ml-1.5">{u.email}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
