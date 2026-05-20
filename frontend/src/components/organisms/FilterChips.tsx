import { useQuery } from '@tanstack/react-query';
import { strategiesApi, segmentsApi, divisionsApi } from '../../services/master.service';
import type { Strategy, Segment, Division } from '../../types/master';

export interface FilterChipsState {
  strategyId: number | null;
  segmentId: number | null;
  divisionId: number | null;
}

interface Props {
  value: FilterChipsState;
  onChange: (next: FilterChipsState) => void;
}

export function FilterChips({ value, onChange }: Props) {
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

  const strategies: Strategy[] = ((stratRes?.data?.data || []) as Strategy[]).filter((s) => s.is_active);
  const segments: Segment[] = ((segRes?.data?.data || []) as Segment[]).filter((s) => s.is_active);
  const divisions: Division[] = ((divRes?.data?.data || []) as Division[]).filter((d) => d.is_active);

  const sortedStrategies = [...strategies].sort((a, b) => a.name.localeCompare(b.name));
  const sortedSegments = [...segments].sort((a, b) => a.name.localeCompare(b.name));
  const sortedDivisions = [...divisions].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-2">
      <ChipRow
        label="Strategy"
        items={sortedStrategies.map((s) => ({ id: s.id, label: s.name }))}
        selected={value.strategyId}
        onSelect={(id) => onChange({ ...value, strategyId: id })}
      />
      <ChipRow
        label="Segment"
        items={sortedSegments.map((s) => ({ id: s.id, label: s.name }))}
        selected={value.segmentId}
        onSelect={(id) => onChange({ ...value, segmentId: id })}
      />
      <ChipRow
        label="Divisi"
        items={sortedDivisions.map((d) => ({ id: d.id, label: `${d.name} (${d.code})` }))}
        selected={value.divisionId}
        onSelect={(id) => onChange({ ...value, divisionId: id })}
      />
    </div>
  );
}

interface ChipRowProps {
  label: string;
  items: { id: number; label: string }[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}

function ChipRow({ label, items, selected, onSelect }: ChipRowProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[60px]">
        {label}
      </span>
      <button
        onClick={() => onSelect(null)}
        className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all ${
          selected === null
            ? 'bg-primary text-white border-primary'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
        }`}
      >
        Semua
      </button>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all ${
            selected === item.id
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
