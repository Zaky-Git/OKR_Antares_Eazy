import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
            <NavItem to="/sprints" icon={<SprintIcon />} label="Sprints" onClick={onClose} />
            <NavItem to="/objectives" icon={<ObjectiveIcon />} label="Objectives" onClick={onClose} />
          </div>
          <div className="mb-5">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Workspace</p>
            <NavItem to="/logs" icon={<LogIcon />} label="Activity Log" onClick={onClose} />
            <NavItem to="/notifications" icon={<NotifIcon />} label="Notifications" onClick={onClose} />
          </div>
          <div className="mb-5">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Settings</p>
            <NavItem to="/admin/masters" icon={<MasterIcon />} label="Master Data" onClick={onClose} />
          </div>
        </nav>


        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-gray-400 truncate">Employee</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600" title="Keluar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </button>
          </div>
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
function MasterIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" /></svg>; }
