import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { initiativeService } from '../../services/initiative.service';
import { sprintService } from '../../services/sprint.service';
import { periodService } from '../../services/period.service';
import { authService } from '../../services/auth.service';
import { Initiative, User } from '../../types';
import toast from 'react-hot-toast';
import { useEffect, useState, useRef } from 'react';

interface Props {
  initiative?: Initiative | null;
  keyResultId: number;
  parentId?: number;
  onClose: () => void;
  onOpenChild?: (child: Initiative) => void;
  onBack?: () => void;
}

interface FormData {
  title: string;
  description: string;
  due_date: string;
  sprint_id: string;
  assignee_id: string;
  status: string;
  progress: number;
  note: string;
}

export function InitiativePanel({ initiative, keyResultId, parentId, onClose, onOpenChild, onBack }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!initiative;
  const hasChildren = initiative?.children && initiative.children.length > 0;
  const isLeaf = isEdit && !hasChildren;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<FormData>({
    defaultValues: getDefaults(initiative),
  });

  const [progressDirty, setProgressDirty] = useState(false);

  useEffect(() => {
    reset(getDefaults(initiative));
    setProgressDirty(false);
  }, [initiative, reset]);

  const watchedProgress = watch('progress');
  const hasChanges = isDirty || progressDirty;


  const { data: cpRes } = useQuery({ queryKey: ['periods', 'current'], queryFn: () => periodService.getCurrent() });
  const periodId = cpRes?.data?.data?.id;
  const { data: sprintsRes } = useQuery({ queryKey: ['sprints', periodId], queryFn: () => sprintService.getByPeriod(periodId!), enabled: !!periodId });
  const sprints = sprintsRes?.data?.data || [];
  const { data: usersRes } = useQuery({ queryKey: ['users'], queryFn: () => authService.getUsers() });
  const users = usersRes?.data?.data || [];


  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = { title: data.title, description: data.description || undefined, due_date: data.due_date || undefined, sprint_id: data.sprint_id ? Number(data.sprint_id) : undefined, assignee_id: data.assignee_id ? Number(data.assignee_id) : undefined, status: data.status };

      if (isEdit) {

        await initiativeService.update(initiative!.id, payload as any);

        if (isLeaf && data.progress !== initiative!.progress) {
          await initiativeService.updateProgress(initiative!.id, { progress: data.progress, note: data.note || undefined });
        }
        return;
      }
      if (parentId) return initiativeService.createChild(parentId, payload);
      return initiativeService.create(keyResultId, payload);
    },
    onSuccess: (_, variables) => {
      toast.success(isEdit ? 'Tersimpan' : 'Dibuat');
      queryClient.invalidateQueries({ queryKey: ['initiative-tree'] });
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['my-active-sprint'] });
      setProgressDirty(false);
      if (isEdit) {
        reset(variables);
      } else {
        onClose();
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => initiativeService.delete(initiative!.id),
    onSuccess: () => { toast.success('Dihapus'); queryClient.invalidateQueries({ queryKey: ['initiative-tree'] }); queryClient.invalidateQueries({ queryKey: ['key-results'] }); queryClient.invalidateQueries({ queryKey: ['objectives'] }); onClose(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal'),
  });


  const [showAddChild, setShowAddChild] = useState(false);
  const [childTitle, setChildTitle] = useState('');
  const childMutation = useMutation({
    mutationFn: () => initiativeService.createChild(initiative!.id, { title: childTitle }),
    onSuccess: async () => {
      toast.success('Sub-initiative dibuat');
      await queryClient.invalidateQueries({ queryKey: ['initiative-tree'] });
      queryClient.invalidateQueries({ queryKey: ['key-results'] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      setChildTitle('');
      setShowAddChild(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal'),
  });

  return (
    <div>

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {onBack && (
            <button type="button" onClick={onBack} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors mr-1" title="Kembali ke parent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded">INITIATIVE</span>
          {parentId && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[11px] font-medium rounded">child</span>}
          {isEdit && onBack && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[11px] font-medium rounded">child</span>}
          {isEdit && <span className="text-xs text-gray-400">#{initiative?.id}</span>}
        </div>
        {isEdit && <IStatusDot status={initiative!.status} />}
      </div>

      <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Judul</label>
          <input {...register('title', { required: 'Wajib diisi' })} placeholder="Nama initiative" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>


        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Deskripsi</label>
          <textarea {...register('description')} rows={2} placeholder="Opsional" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none" />
        </div>


        {isLeaf && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Progress</label>
            <div className="bg-gray-50 rounded-xl p-4">
              {watch('status') === 'DONE' || watch('status') === 'CANCELLED' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Progress terkunci</span>
                    <span className="text-base font-bold text-gray-700">{watchedProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${watchedProgress >= 100 ? 'bg-emerald-500' : 'bg-gray-400'}`} style={{ width: `${watchedProgress}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 italic">Ubah status untuk mengaktifkan kembali progress</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <input type="range" min="0" max="100" value={watchedProgress}
                      onChange={(e) => { setValue('progress', Number(e.target.value)); setProgressDirty(true); }}
                      className="flex-1 h-2 accent-primary cursor-pointer" />
                    <span className="text-base font-bold text-gray-700 w-12 text-right">{watchedProgress}%</span>
                  </div>
                  <input {...register('note')} placeholder="Catatan progress (opsional)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary" />
                </>
              )}
            </div>
          </div>
        )}


        {isEdit && hasChildren && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">Progress</span>
              <span className="text-base font-bold text-gray-800">{initiative?.progress.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${initiative!.progress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${initiative?.progress}%` }} />
            </div>
            <p className="text-[11px] text-gray-400 mt-2 italic">Auto-calculated dari {initiative?.children?.length} sub-initiatives</p>
          </div>
        )}


        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">PIC (Assignee)</label>
          <AssigneeSelector value={watch('assignee_id')} onChange={(val) => setValue('assignee_id', val, { shouldDirty: true })} users={users} />
        </div>


        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</label>
            <input type="date" {...register('due_date')} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sprint</label>
            <div className="relative">
              <select {...register('sprint_id')} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 appearance-none pr-9 cursor-pointer">
                <option value="">—</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
            </div>
          </div>
        </div>


        {isEdit && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
            <div className="grid grid-cols-3 gap-1.5">
              {['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'].map(s => (
                <button key={s} type="button" onClick={() => setValue('status', s, { shouldDirty: true })}
                  className={`px-2 py-2 text-[11px] font-medium rounded-lg border transition-colors ${watch('status') === s ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {s.toLowerCase().replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}


        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {isEdit ? (
            <button type="button" onClick={() => { if (confirm('Hapus initiative ini?')) deleteMutation.mutate(); }} className="text-xs text-red-500 hover:text-red-700 font-medium">Hapus</button>
          ) : <span />}
          <button type="submit" disabled={saveMutation.isPending || (isEdit && !hasChanges)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              isEdit && !hasChanges
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-hover'
            }`}>
            {saveMutation.isPending ? 'Menyimpan...' : isEdit ? 'Simpan' : parentId ? 'Buat Sub' : 'Buat'}
          </button>
        </div>
      </form>


      {isEdit && (
        <div className="mt-6 pt-5 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sub-Initiatives</h4>
          <ChildList parentId={initiative!.id} onOpenChild={onOpenChild} />
          {!showAddChild ? (
            <button type="button" onClick={() => setShowAddChild(true)} className="w-full mt-2 px-4 py-2.5 text-sm font-medium text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
              Tambah Sub-Initiative
            </button>
          ) : (
            <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <input value={childTitle} onChange={(e) => setChildTitle(e.target.value)} placeholder="Nama sub-initiative" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:border-primary" autoFocus />
              <div className="flex gap-2">
                <button type="button" onClick={() => childMutation.mutate()} disabled={!childTitle.trim() || childMutation.isPending} className="px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50">
                  {childMutation.isPending ? '...' : 'Simpan'}
                </button>
                <button type="button" onClick={() => { setShowAddChild(false); setChildTitle(''); }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Batal</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getDefaults(initiative?: Initiative | null): FormData {
  return {
    title: initiative?.title || '',
    description: initiative?.description || '',
    due_date: initiative?.due_date ? initiative.due_date.slice(0, 10) : '',
    sprint_id: initiative?.sprint_id ? String(initiative.sprint_id) : '',
    assignee_id: initiative?.assignee_id ? String(initiative.assignee_id) : '',
    status: initiative?.status || 'TODO',
    progress: initiative?.progress || 0,
    note: '',
  };
}

function ChildList({ parentId, onOpenChild }: { parentId: number; onOpenChild?: (child: Initiative) => void }) {
  const queryClient = useQueryClient();


  const [children, setChildren] = useState<Initiative[]>([]);

  useEffect(() => {

    const findChildren = () => {
      const queries = queryClient.getQueriesData<any>({ queryKey: ['initiative-tree'] });
      for (const [, data] of queries) {
        const found = findInTree(data?.data?.data || [], parentId);
        if (found) { setChildren(found); return; }
      }
      setChildren([]);
    };
    findChildren();
    const unsub = queryClient.getQueryCache().subscribe(() => findChildren());
    return () => unsub();
  }, [parentId, queryClient]);

  if (children.length === 0) return null;

  return (
    <div className="space-y-1 mb-2">
      {children.map(c => (
        <div key={c.id} onClick={() => onOpenChild?.(c)}
          className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50/50 transition-colors group">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.status === 'DONE' ? 'bg-emerald-400' : c.status === 'IN_PROGRESS' ? 'bg-blue-400' : c.status === 'BLOCKED' ? 'bg-red-400' : 'bg-gray-300'}`} />
          <span className="text-sm text-gray-700 flex-1 truncate">{c.title}</span>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${c.progress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${c.progress}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-gray-500 w-7 text-right">{c.progress.toFixed(0)}%</span>
            <svg className="text-gray-300 group-hover:text-primary transition-colors" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </div>
        </div>
      ))}
    </div>
  );
}

function findInTree(items: Initiative[], parentId: number): Initiative[] | null {
  for (const item of items) {
    if (item.id === parentId) return item.children || [];
    if (item.children) {
      const found = findInTree(item.children, parentId);
      if (found) return found;
    }
  }
  return null;
}

function IStatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { TODO: 'bg-gray-400', IN_PROGRESS: 'bg-blue-500', BLOCKED: 'bg-red-500', DONE: 'bg-emerald-500', CANCELLED: 'bg-gray-300' };
  const labels: Record<string, string> = { TODO: 'Todo', IN_PROGRESS: 'In Progress', BLOCKED: 'Blocked', DONE: 'Done', CANCELLED: 'Cancelled' };
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[status] || colors.TODO}`} />
      <span className="text-xs font-medium text-gray-600">{labels[status] || status}</span>
    </div>
  );
}

function AssigneeSelector({ value, onChange, users }: { value: string; onChange: (val: string) => void; users: User[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const selected = users.find(u => String(u.id) === value);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-left hover:border-gray-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors">
        {selected ? (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">{selected.name.charAt(0).toUpperCase()}</div>
            <span className="font-medium text-gray-900 text-sm">{selected.name}</span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">Pilih assignee...</span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div onClick={() => { onChange(''); setOpen(false); }} className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2.5 ${!value ? 'bg-primary/5' : ''}`}>
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8" /></svg></div>
            <span className="text-gray-500">Tidak ada</span>
          </div>
          {users.map(u => (
            <div key={u.id} onClick={() => { onChange(String(u.id)); setOpen(false); }} className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2.5 ${String(u.id) === value ? 'bg-primary/5' : ''}`}>
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">{u.name.charAt(0).toUpperCase()}</div>
              <div><span className="font-medium text-gray-900">{u.name}</span><span className="text-gray-400 text-[11px] ml-1.5">{u.email}</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
