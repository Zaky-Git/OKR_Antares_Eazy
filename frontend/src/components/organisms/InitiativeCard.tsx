import { useState, useRef, useEffect } from 'react';
import type { SprintInitiative } from '../../types';

interface InitiativeCardProps {
  initiative: SprintInitiative;
  onClick: (initiative: SprintInitiative) => void;
  onRemoveFromSprint?: (initiative: SprintInitiative) => void;
}

const STATUS_DOT_COLOR: Record<string, string> = {
  TODO: 'bg-gray-400',
  IN_PROGRESS: 'bg-indigo-500',
  BLOCKED: 'bg-red-500',
  DONE: 'bg-blue-500',
  CANCELLED: 'bg-gray-300',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function getDaysLeft(dateStr: string): { label: string; className: string } | null {
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: 'text-red-600 bg-red-50' };
  if (days === 0) return { label: 'Today', className: 'text-amber-700 bg-amber-50' };
  if (days <= 3) return { label: `${days}d left`, className: 'text-amber-600 bg-amber-50' };
  return null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function InitiativeCard({ initiative, onClick, onRemoveFromSprint }: InitiativeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const dueBadge = initiative.due_date && initiative.status !== 'DONE' && initiative.status !== 'CANCELLED'
    ? getDaysLeft(initiative.due_date)
    : null;

  return (
    <div
      onClick={() => onClick(initiative)}
      className="bg-white border border-gray-200 rounded-lg p-2.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group relative"
    >
      {/* Context menu button */}
      {onRemoveFromSprint && (
        <div ref={menuRef} className="absolute top-1.5 right-1.5 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onRemoveFromSprint(initiative);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                Keluarkan dari Sprint
              </button>
            </div>
          )}
        </div>
      )}
      {/* Breadcrumbs */}
      {(initiative.key_result_title || initiative.parent_title) && (
        <div className="mb-1.5">
          {initiative.key_result_title && (
            <p className="text-[10px] text-gray-400 truncate">
              <span className="text-gray-500 font-medium">KR</span> {initiative.key_result_title}
            </p>
          )}
          {initiative.parent_title && (
            <p className="text-[10px] text-gray-400 truncate">
              <span className="text-gray-500 font-medium">↳</span> {initiative.parent_title}
            </p>
          )}
        </div>
      )}

      {/* Title */}
      <div className="flex items-start gap-1.5 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${STATUS_DOT_COLOR[initiative.status] || STATUS_DOT_COLOR.TODO}`} />
        <h4 className="text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {initiative.title}
        </h4>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              initiative.progress >= 100 ? 'bg-emerald-500' : initiative.progress >= 70 ? 'bg-emerald-400' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, initiative.progress))}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold text-gray-500 whitespace-nowrap min-w-[28px] text-right">
          {Math.round(initiative.progress)}%
        </span>
      </div>

      {/* Footer: Assignee + Due Date */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {initiative.assignee_name ? (
            <>
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                {getInitials(initiative.assignee_name)}
              </div>
              <span className="text-[10px] text-gray-600 truncate">{initiative.assignee_name}</span>
            </>
          ) : (
            <span className="text-[10px] text-gray-400 italic">No assignee</span>
          )}
        </div>
        {dueBadge ? (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${dueBadge.className} whitespace-nowrap`}>
            {dueBadge.label}
          </span>
        ) : initiative.due_date ? (
          <span className="text-[10px] text-gray-400 whitespace-nowrap flex items-center gap-1">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {formatDate(initiative.due_date)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
