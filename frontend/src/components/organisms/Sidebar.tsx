import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfileClose = () => setProfileOpen(false);

  return (
    <>

      {open && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />}

      <aside className={`w-[220px] h-screen fixed left-0 top-0 bg-white border-r border-gray-100 flex flex-col z-50 transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-1">
            <span className="text-primary font-extrabold text-sm">eazy</span>
            <span className="font-bold text-sm text-gray-800">OKR</span>
            <span className="text-xs text-gray-400 ml-1">Antares Eazy</span>
          </div>
        </div>


        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="mb-5">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Main</p>
            <NavItem to="/dashboard" icon={<DashboardIcon />} label="Dashboard" onClick={onClose} />
          </div>
          <div className="mb-5">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Management</p>
            <NavItem to="/objectives" icon={<ObjectiveIcon />} label="Objectives" onClick={onClose} />
            <NavItem to="/sprints" icon={<SprintIcon />} label="Sprints" onClick={onClose} />
          </div>
          <div className="mb-5">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Workspace</p>
            <NavItem to="/logs" icon={<LogIcon />} label="Activity Log" onClick={onClose} />
            <NavItem to="/notifications" icon={<NotifIcon />} label="Notifications" onClick={onClose} />
          </div>
        </nav>


        {/* User profile section */}
        <div className="px-4 py-3 border-t border-gray-100 relative" ref={profileRef}>
          {/* Popup menu */}
          {profileOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
                </div>
              </div>
              <div className="border-t border-gray-100" />
              {/* Menu items */}
              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={handleProfileClose}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Profil Saya
                </Link>
              </div>
              <div className="border-t border-gray-100" />
              {/* Logout */}
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  Keluar
                </button>
              </div>
            </div>
          )}

          {/* Trigger button */}
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-gray-400 truncate">Employee</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}

function NavItem({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <NavLink to={to} onClick={onClick} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors mb-0.5 ${isActive ? 'bg-primary/5 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
      {icon}
      {label}
    </NavLink>
  );
}

function DashboardIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>; }
function ObjectiveIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>; }
function SprintIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>; }
function LogIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20V10M18 20V4M6 20v-4" strokeLinecap="round" /></svg>; }
function NotifIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>; }
