import { useState, useRef, useEffect } from 'react';

interface YearPickerProps {
  value: number;
  years: number[];
  onChange: (year: number) => void;
}

export function YearPicker({ value, years, onChange }: YearPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const sortedYears = [...years].sort((a, b) => b - a);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-0.5 px-2 py-1 text-xs font-bold text-gray-600 hover:text-primary hover:bg-white rounded-md transition-all"
      >
        {value}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[80px] max-h-[180px] overflow-y-auto py-1">
          {sortedYears.map(y => (
            <button
              key={y}
              onClick={() => { onChange(y); setOpen(false); }}
              className={`w-full px-3 py-1.5 text-xs font-medium text-left transition-colors ${
                y === value
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
