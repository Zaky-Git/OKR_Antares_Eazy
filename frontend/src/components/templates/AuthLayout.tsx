import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

export function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
