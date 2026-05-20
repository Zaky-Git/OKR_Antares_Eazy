import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../organisms/Sidebar';
import { TopBar } from '../organisms/TopBar';
import { useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/objectives/')) return 'Objective Detail';
  if (pathname === '/objectives') return 'Objectives';
  if (pathname.startsWith('/sprints/')) return 'Sprint Detail';
  if (pathname === '/sprints') return 'Sprints';
  if (pathname === '/logs') return 'Activity Log';
  if (pathname === '/notifications') return 'Notifications';
  if (pathname === '/admin/masters') return 'Master Data';
  return 'Dashboard';
}

export function AppLayout() {
  const location = useLocation();
  const title = getPageTitle(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);


  useWebSocket();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:ml-[220px]">
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
