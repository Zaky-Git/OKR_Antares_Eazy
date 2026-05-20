import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ObjectivesPage } from '../pages/ObjectivesPage';
import { ObjectiveDetailPage } from '../pages/ObjectiveDetailPage';
import { SprintsPage } from '../pages/SprintsPage';
import { SprintDetailPage } from '../pages/SprintDetailPage';
import { LogsPage } from '../pages/LogsPage';
import { MasterAdminPage } from '../pages/MasterAdminPage';
import { AppLayout } from '../components/templates/AppLayout';
import { AuthLayout } from '../components/templates/AuthLayout';
import { ProtectedRoute } from '../guards/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/objectives', element: <ObjectivesPage /> },
      { path: '/objectives/:id', element: <ObjectiveDetailPage /> },
      { path: '/sprints', element: <SprintsPage /> },
      { path: '/sprints/:id', element: <SprintDetailPage /> },
      { path: '/logs', element: <LogsPage /> },
      { path: '/admin/masters', element: <MasterAdminPage /> },
    ],
  },
]);
