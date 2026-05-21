import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../../services/notification.service';
import { periodService } from '../../services/period.service';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ApiResponse } from '../../types';

interface Props {
  title: string;
  onMenuClick: () => void;
}

interface SearchResult {
  type: string;
  id: number;
  title: string;
  description: string;
  parent_id: number | null;
  parent_title: string;
  objective_id: number | null;
}

export function TopBar({ title, onMenuClick }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: currentPeriodRes } = useQuery({
    queryKey: ['periods', 'current'],
    queryFn: () => periodService.getCurrent(),
  });

  const { data: unreadRes } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30000,
  });

  const currentPeriod = currentPeriodRes?.data?.data;
  const unreadCount = unreadRes?.data?.data?.count || 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) {
        setMobileSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<ApiResponse<SearchResult[]>>(`/search?q=${encodeURIComponent(value.trim())}`);
        setResults(res.data.data || []);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setMobileSearchOpen(false);
    setQuery('');

    switch (result.type) {
      case 'objective':
        navigate(`/objectives?highlightObj=${result.id}`);
        break;
      case 'key_result':
        navigate(`/objectives?highlightKR=${result.id}&objective=${result.objective_id}`);
        break;
      case 'initiative':
        navigate(`/objectives?highlight=${result.id}`);
        break;
      case 'sprint':
        navigate(`/sprints?highlightSprint=${result.id}`);
        break;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'objective':
        return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#194FBC" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
      case 'key_result':
        return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
      case 'initiative':
        return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M6 3v18" /><path d="M6 9h12l-4-4" /><path d="M6 15h8l-4-4" /></svg>;
      case 'sprint':
        return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { objective: 'Objective', key_result: 'Key Result', initiative: 'Initiative', sprint: 'Sprint' };
    return labels[type] || type;
  };

  // Period info component (shared between desktop & mobile)
  const periodInfo = currentPeriod ? (
    <button
      onClick={() => {
        const path = window.location.pathname;
        if (path === '/dashboard' || path === '/objectives') {
          window.dispatchEvent(new CustomEvent('reset-to-current-period'));
        } else {
          navigate('/dashboard');
        }
      }}
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/5 hover:bg-primary/10 border border-primary/15 rounded-md text-[11px] font-medium text-primary transition-colors flex-shrink-0"
      title="Klik untuk ke dashboard quarter saat ini"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      <span>{currentPeriod.quarter} {currentPeriod.year}</span>
      {(() => {
        const daysLeft = Math.ceil((new Date(currentPeriod.end_date).getTime() - Date.now()) / 86400000);
        let label = '';
        let cls = 'text-primary/60';
        if (daysLeft > 0) label = `${daysLeft}d`;
        else if (daysLeft === 0) { label = 'today'; cls = 'text-amber-600'; }
        else { label = `${Math.abs(daysLeft)}d over`; cls = 'text-red-600'; }
        return (
          <>
            <span className="text-primary/30 hidden sm:inline">•</span>
            <span className={`${cls} hidden sm:inline`}>{label} left</span>
          </>
        );
      })()}
    </button>
  ) : null;

  // Search input (reused for desktop and mobile overlay)
  const searchInput = (autoFocus?: boolean) => (
    <div className="relative w-full">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        autoFocus={autoFocus}
        type="text"
        placeholder="Cari objective, key result, initiative, sprint..."
        className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => { if (results.length > 0) setShowResults(true); }}
      />
      {loading ? (
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : query ? (
        <button
          onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );

  // Results dropdown
  const searchResults = showResults && (
    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-[360px] overflow-y-auto">
      {results.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">
          Tidak ditemukan hasil untuk "{query}"
        </div>
      ) : (
        <div className="py-1">
          {results.map((r, idx) => (
            <button
              key={`${r.type}-${r.id}-${idx}`}
              onClick={() => handleResultClick(r)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="mt-0.5 shrink-0">{getTypeIcon(r.type)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{getTypeLabel(r.type)}</span>
                  {r.parent_title && <span className="text-[11px] text-gray-400 truncate">• {r.parent_title}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <header className="h-14 bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="h-full flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 relative">
        {/* LEFT: Sidebar toggle + Title + Period pill */}
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onMenuClick} className="text-gray-400 hover:text-gray-600 p-1 md:hidden flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          </button>
          <span className="font-semibold text-gray-800 truncate text-sm md:text-base">{title}</span>
          {periodInfo}
        </div>

        {/* CENTER: Search — absolutely centered to the bar */}
        <div className="hidden md:block absolute left-1/2 -translate-x-1/2 w-full max-w-md px-4 pointer-events-none">
          <div className="relative w-full pointer-events-auto" ref={searchRef}>
            {searchInput()}
            {searchResults}
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Mobile search toggle */}
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg"
            title="Cari"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          <button onClick={() => navigate('/notifications')} className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg" title="Notifikasi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="md:hidden absolute inset-x-0 top-0 h-14 bg-white border-b border-gray-100 flex items-center gap-2 px-4 z-40" ref={mobileSearchRef}>
          <button
            onClick={() => { setMobileSearchOpen(false); setQuery(''); setResults([]); setShowResults(false); }}
            className="text-gray-500 hover:text-gray-700 p-1 flex-shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="relative flex-1 min-w-0">
            {searchInput(true)}
            {searchResults}
          </div>
        </div>
      )}
    </header>
  );
}
