import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Modal,
  Input,
  Textarea,
  Button,
  Spinner,
  ColorSwatch,
  ColorPicker,
  ConfirmDialog,
} from '../components/atomics';
import { strategiesApi, segmentsApi, divisionsApi } from '../services/master.service';
import type {
  Strategy,
  Segment,
  Division,
  CreateStrategyDto,
  CreateSegmentDto,
  CreateDivisionDto,
} from '../types/master';

type TabKey = 'strategy' | 'segment' | 'division';

const TAB_CONFIG: Record<TabKey, { label: string; addLabel: string }> = {
  strategy: { label: 'Strategy', addLabel: 'Tambah Strategy' },
  segment: { label: 'Segment', addLabel: 'Tambah Segment' },
  division: { label: 'Divisi', addLabel: 'Tambah Divisi' },
};

const PAGE_SIZE = 10;

export function MasterAdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('strategy');

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Master Data</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola data master Strategy, Segment, dan Divisi yang dipakai oleh Objective.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {(Object.keys(TAB_CONFIG) as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === tab
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {TAB_CONFIG[tab].label}
          </button>
        ))}
      </div>

      {activeTab === 'strategy' && <StrategyTab />}
      {activeTab === 'segment' && <SegmentTab />}
      {activeTab === 'division' && <DivisionTab />}
    </div>
  );
}

// Custom hook for debounced search input
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ============================================================================
// Strategy Tab
// ============================================================================

function StrategyTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Strategy | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['masters', 'strategies', { page, search: debouncedSearch }],
    queryFn: () => strategiesApi.list({ page, limit: PAGE_SIZE, search: debouncedSearch }),
    placeholderData: keepPreviousData,
  });

  const items: Strategy[] = data?.data?.data || [];
  const meta = data?.data?.meta;

  const removeMut = useMutation({
    mutationFn: (id: number) => strategiesApi.remove(id),
    onSuccess: () => {
      toast.success('Strategy dihapus');
      qc.invalidateQueries({ queryKey: ['masters', 'strategies'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal menghapus strategy'),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <Toolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={() => { setEditing(null); setShowForm(true); }}
        addLabel="Tambah Strategy"
        loading={isFetching}
      />

      <MasterTable
        columns={['Nama', 'Deskripsi', 'Warna', 'Urutan', 'Status']}
        items={items}
        renderRow={(item) => [
          <span className="font-medium text-gray-800">{item.name}</span>,
          <span className="text-gray-500 text-sm">{item.description || '—'}</span>,
          <ColorCell color={item.color} />,
          <span className="text-gray-600">{item.sort_order}</span>,
          item.is_active ? <ActiveBadge /> : <InactiveBadge />,
        ]}
        onEdit={(it) => { setEditing(it); setShowForm(true); }}
        onDelete={(id) => setDeleteTarget(id)}
        emptyMessage={debouncedSearch ? 'Tidak ada strategy yang cocok dengan pencarian.' : 'Belum ada strategy.'}
      />

      {meta && meta.total > 0 && (
        <Pagination meta={meta} onChange={setPage} />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Strategy?"
        message="Objective yang menggunakan strategy ini akan di-clear. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        onConfirm={() => { const id = deleteTarget!; setDeleteTarget(null); removeMut.mutate(id); }}
        onCancel={() => setDeleteTarget(null)}
      />

      {showForm && (
        <StrategyFormModal
          open={showForm}
          editing={editing}
          onClose={() => { setEditing(null); setShowForm(false); }}
        />
      )}
    </div>
  );
}

function StrategyFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Strategy | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(editing?.name || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [color, setColor] = useState(editing?.color || '#194FBC');
  const [sortOrder, setSortOrder] = useState(editing?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: CreateStrategyDto = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        sort_order: sortOrder,
        is_active: isActive,
      };
      if (editing) return strategiesApi.update(editing.id, payload);
      return strategiesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Strategy diperbarui' : 'Strategy dibuat');
      qc.invalidateQueries({ queryKey: ['masters', 'strategies'] });
      onClose();
    },
    onError: (err: any) => {
      const fieldErrs = err?.response?.data?.errors;
      if (fieldErrs && typeof fieldErrs === 'object') setErrors(fieldErrs);
      toast.error(err?.response?.data?.message || 'Operasi gagal, silakan coba lagi');
    },
  });

  const trimmed = name.trim();
  const isValid = trimmed.length >= 1 && trimmed.length <= 100 && /^#[0-9A-Fa-f]{6}$/.test(color);

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Strategy' : 'Tambah Strategy'} size="md">
      <div className="space-y-4">
        <Input label="Nama *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Defend to Scale" error={errors.name} maxLength={100} />
        <Textarea label="Deskripsi" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} error={errors.description} />
        <ColorPicker label="Warna *" value={color} onChange={setColor} error={errors.color} />
        <Input label="Urutan" type="number" value={String(sortOrder)} onChange={(e) => setSortOrder(Number(e.target.value))} min={0} max={9999} error={errors.sort_order} />
        <ActiveCheckbox checked={isActive} onChange={setIsActive} hint="Tampil di dropdown form Objective" />

        <FormActions onCancel={onClose} onSave={() => saveMut.mutate()} isSaving={saveMut.isPending} disabled={!isValid} />
      </div>
    </Modal>
  );
}

// ============================================================================
// Segment Tab
// ============================================================================

function SegmentTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Segment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['masters', 'segments', { page, search: debouncedSearch }],
    queryFn: () => segmentsApi.list({ page, limit: PAGE_SIZE, search: debouncedSearch }),
    placeholderData: keepPreviousData,
  });

  const items: Segment[] = data?.data?.data || [];
  const meta = data?.data?.meta;

  const removeMut = useMutation({
    mutationFn: (id: number) => segmentsApi.remove(id),
    onSuccess: () => {
      toast.success('Segment dihapus');
      qc.invalidateQueries({ queryKey: ['masters', 'segments'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal menghapus segment'),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <Toolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={() => { setEditing(null); setShowForm(true); }}
        addLabel="Tambah Segment"
        loading={isFetching}
      />

      <MasterTable
        columns={['Nama', 'Deskripsi', 'Warna', 'Status']}
        items={items}
        renderRow={(item) => [
          <span className="font-medium text-gray-800">{item.name}</span>,
          <span className="text-gray-500 text-sm">{item.description || '—'}</span>,
          <ColorCell color={item.color} />,
          item.is_active ? <ActiveBadge /> : <InactiveBadge />,
        ]}
        onEdit={(it) => { setEditing(it); setShowForm(true); }}
        onDelete={(id) => setDeleteTarget(id)}
        emptyMessage={debouncedSearch ? 'Tidak ada segment yang cocok dengan pencarian.' : 'Belum ada segment.'}
      />

      {meta && meta.total > 0 && (
        <Pagination meta={meta} onChange={setPage} />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Segment?"
        message="Objective yang menggunakan segment ini akan di-clear. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        onConfirm={() => { const id = deleteTarget!; setDeleteTarget(null); removeMut.mutate(id); }}
        onCancel={() => setDeleteTarget(null)}
      />

      {showForm && (
        <SegmentFormModal
          open={showForm}
          editing={editing}
          onClose={() => { setEditing(null); setShowForm(false); }}
        />
      )}
    </div>
  );
}

function SegmentFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Segment | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(editing?.name || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [color, setColor] = useState(editing?.color || '#3B82F6');
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: CreateSegmentDto = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        is_active: isActive,
      };
      if (editing) return segmentsApi.update(editing.id, payload);
      return segmentsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Segment diperbarui' : 'Segment dibuat');
      qc.invalidateQueries({ queryKey: ['masters', 'segments'] });
      onClose();
    },
    onError: (err: any) => {
      const fieldErrs = err?.response?.data?.errors;
      if (fieldErrs && typeof fieldErrs === 'object') setErrors(fieldErrs);
      toast.error(err?.response?.data?.message || 'Operasi gagal, silakan coba lagi');
    },
  });

  const trimmed = name.trim();
  const isValid = trimmed.length >= 1 && trimmed.length <= 100 && /^#[0-9A-Fa-f]{6}$/.test(color);

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Segment' : 'Tambah Segment'} size="md">
      <div className="space-y-4">
        <Input label="Nama *" value={name} onChange={(e) => setName(e.target.value)} placeholder="SME" error={errors.name} maxLength={100} />
        <Textarea label="Deskripsi" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} error={errors.description} />
        <ColorPicker label="Warna *" value={color} onChange={setColor} error={errors.color} />
        <ActiveCheckbox checked={isActive} onChange={setIsActive} />

        <FormActions onCancel={onClose} onSave={() => saveMut.mutate()} isSaving={saveMut.isPending} disabled={!isValid} />
      </div>
    </Modal>
  );
}

// ============================================================================
// Division Tab
// ============================================================================

function DivisionTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Division | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['masters', 'divisions', { page, search: debouncedSearch }],
    queryFn: () => divisionsApi.list({ page, limit: PAGE_SIZE, search: debouncedSearch }),
    placeholderData: keepPreviousData,
  });

  const items: Division[] = data?.data?.data || [];
  const meta = data?.data?.meta;

  const removeMut = useMutation({
    mutationFn: (id: number) => divisionsApi.remove(id),
    onSuccess: () => {
      toast.success('Divisi dihapus');
      qc.invalidateQueries({ queryKey: ['masters', 'divisions'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal menghapus divisi'),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <Toolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={() => { setEditing(null); setShowForm(true); }}
        addLabel="Tambah Divisi"
        loading={isFetching}
      />

      <MasterTable
        columns={['Nama', 'Kode', 'Deskripsi', 'Warna', 'Status']}
        items={items}
        renderRow={(item) => [
          <span className="font-medium text-gray-800">{item.name}</span>,
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-700">{item.code}</code>,
          <span className="text-gray-500 text-sm">{item.description || '—'}</span>,
          <ColorCell color={item.color} />,
          item.is_active ? <ActiveBadge /> : <InactiveBadge />,
        ]}
        onEdit={(it) => { setEditing(it); setShowForm(true); }}
        onDelete={(id) => setDeleteTarget(id)}
        emptyMessage={debouncedSearch ? 'Tidak ada divisi yang cocok dengan pencarian.' : 'Belum ada divisi.'}
      />

      {meta && meta.total > 0 && (
        <Pagination meta={meta} onChange={setPage} />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Divisi?"
        message="Objective yang menggunakan divisi ini akan di-clear. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        onConfirm={() => { const id = deleteTarget!; setDeleteTarget(null); removeMut.mutate(id); }}
        onCancel={() => setDeleteTarget(null)}
      />

      {showForm && (
        <DivisionFormModal
          open={showForm}
          editing={editing}
          onClose={() => { setEditing(null); setShowForm(false); }}
        />
      )}
    </div>
  );
}

function DivisionFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Division | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(editing?.name || '');
  const [code, setCode] = useState(editing?.code || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [color, setColor] = useState(editing?.color || '#194FBC');
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: CreateDivisionDto = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        color,
        is_active: isActive,
      };
      if (editing) return divisionsApi.update(editing.id, payload);
      return divisionsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Divisi diperbarui' : 'Divisi dibuat');
      qc.invalidateQueries({ queryKey: ['masters', 'divisions'] });
      onClose();
    },
    onError: (err: any) => {
      const fieldErrs = err?.response?.data?.errors;
      if (fieldErrs && typeof fieldErrs === 'object') setErrors(fieldErrs);
      toast.error(err?.response?.data?.message || 'Operasi gagal, silakan coba lagi');
    },
  });

  const trimmedName = name.trim();
  const trimmedCode = code.trim();
  const isValid =
    trimmedName.length >= 1 && trimmedName.length <= 100 &&
    trimmedCode.length >= 1 && trimmedCode.length <= 20 &&
    /^#[0-9A-Fa-f]{6}$/.test(color);

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Divisi' : 'Tambah Divisi'} size="md">
      <div className="space-y-4">
        <Input label="Nama *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Product" error={errors.name} maxLength={100} />
        <Input label="Kode *" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PROD" error={errors.code} maxLength={20} />
        <Textarea label="Deskripsi" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} error={errors.description} />
        <ColorPicker label="Warna *" value={color} onChange={setColor} error={errors.color} />
        <ActiveCheckbox checked={isActive} onChange={setIsActive} />

        <FormActions onCancel={onClose} onSave={() => saveMut.mutate()} isSaving={saveMut.isPending} disabled={!isValid} />
      </div>
    </Modal>
  );
}

// ============================================================================
// Shared UI helpers
// ============================================================================

function Toolbar({
  search,
  onSearchChange,
  onAdd,
  addLabel,
  loading,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  onAdd: () => void;
  addLabel: string;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="relative flex-1 max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari..."
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={onAdd}>
          <span className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            {addLabel}
          </span>
        </Button>
      </div>
    </div>
  );
}

interface PaginationMetaShape {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

function Pagination({ meta, onChange }: { meta: PaginationMetaShape; onChange: (p: number) => void }) {
  const { page, total_pages, total, limit } = meta;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pageNumbers = generatePageNumbers(page, total_pages);
  const showPageButtons = total_pages > 1;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2">
      <p className="text-xs text-gray-500">
        Menampilkan <span className="font-semibold text-gray-700">{start}–{end}</span> dari <span className="font-semibold text-gray-700">{total}</span>
      </p>
      {showPageButtons && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            Prev
          </button>
          {pageNumbers.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 py-1 text-xs text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p as number)}
                className={`min-w-[28px] px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  p === page
                    ? 'bg-primary text-white'
                    : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => onChange(page + 1)}
            disabled={page >= total_pages}
            className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            Next
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}

// Generate compact page numbers like [1, 2, 3, 4, 5] or [1, '...', 4, 5, 6, '...', 10]
function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];
  pages.push(1);

  const startMid = Math.max(2, current - 1);
  const endMid = Math.min(total - 1, current + 1);

  if (startMid > 2) pages.push('...');
  for (let i = startMid; i <= endMid; i++) pages.push(i);
  if (endMid < total - 1) pages.push('...');

  pages.push(total);
  return pages;
}

function ColorCell({ color }: { color: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <ColorSwatch color={color} size={14} />
      <span className="font-mono text-xs text-gray-500">{color}</span>
    </span>
  );
}

function ActiveCheckbox({ checked, onChange, hint }: { checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-0.5 text-primary rounded"
      />
      <div>
        <span className="font-medium text-gray-700">Aktif</span>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

function FormActions({ onCancel, onSave, isSaving, disabled }: { onCancel: () => void; onSave: () => void; isSaving: boolean; disabled: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
      <Button variant="secondary" onClick={onCancel} disabled={isSaving}>Batal</Button>
      <Button onClick={onSave} isLoading={isSaving} disabled={disabled}>Simpan</Button>
    </div>
  );
}

interface MasterTableProps<T extends { id: number }> {
  columns: string[];
  items: T[];
  renderRow: (item: T) => React.ReactNode[];
  onEdit: (item: T) => void;
  onDelete: (id: number) => void;
  emptyMessage?: string;
}

function MasterTable<T extends { id: number }>({ columns, items, renderRow, onEdit, onDelete, emptyMessage = 'Belum ada data.' }: MasterTableProps<T>) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-2xl">
        <div className="w-12 h-12 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h7" />
            <path d="M16 21h6M19 18v6" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {c}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider w-24">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                {renderRow(item).map((cell, i) => (
                  <td key={i} className="px-4 py-3 align-middle">{cell}</td>
                ))}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(item)}
                      className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                      title="Edit"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Hapus"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-full border border-emerald-200">
      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
      Aktif
    </span>
  );
}

function InactiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-500 text-[11px] font-medium rounded-full border border-gray-200">
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
      Nonaktif
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="md" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-12 bg-red-50 border border-red-200 rounded-2xl">
      <p className="text-sm text-red-700 mb-3">Gagal memuat data.</p>
      <Button variant="secondary" onClick={onRetry}>Coba lagi</Button>
    </div>
  );
}
