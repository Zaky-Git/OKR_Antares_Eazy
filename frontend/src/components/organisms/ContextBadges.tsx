import { getBadgeColor } from '../../utils/getBadgeColor';
import type { Objective } from '../../types';

interface Props {
  strategy?: Objective['strategy'];
  segment?: Objective['segment'];
  division?: Objective['division'];
  className?: string;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

// Determine readable text color for a given background hex (returns dark or light).
function readableTextColor(hex: string): string {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!m) return '#374151';
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1F2937' : '#FFFFFF';
}

function ContextBadge({ label, color }: { label: string; color: string | null | undefined }) {
  const safeColor = getBadgeColor(color);
  const textColor = readableTextColor(safeColor);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
      style={{ backgroundColor: safeColor, color: textColor, borderColor: safeColor }}
    >
      {label}
    </span>
  );
}

export function ContextBadges({ strategy, segment, division, className = '' }: Props) {
  const hasAny = !!strategy || !!segment || !!division;
  if (!hasAny) return null;

  // Combine strategy + segment into one badge: "Strategy (Segment)"
  let combinedLabel: string | null = null;
  let combinedColor: string | null | undefined = null;
  if (strategy && segment) {
    combinedLabel = `${truncate(strategy.name, 20)} (${truncate(segment.name, 20)})`;
    combinedColor = strategy.color;
  } else if (strategy) {
    combinedLabel = truncate(strategy.name, 30);
    combinedColor = strategy.color;
  } else if (segment) {
    combinedLabel = truncate(segment.name, 30);
    combinedColor = segment.color;
  }

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {combinedLabel && <ContextBadge label={combinedLabel} color={combinedColor} />}
      {division && <ContextBadge label={division.code} color={division.color} />}
    </div>
  );
}
