interface ProgressBarProps {
  value: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({ value, size = 'md', className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = clamped >= 100 ? 'bg-emerald-500' : clamped >= 70 ? 'bg-emerald-400' : 'bg-primary';
  const height = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className={`w-full ${height} bg-gray-100 rounded-full overflow-hidden ${className}`}>
      <div className={`${height} rounded-full ${color} transition-all duration-500`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
