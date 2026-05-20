import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './app/queryClient';
import { router } from './app/router';
import { useEffect } from 'react';
import { periodService } from './services/period.service';
import { useAuthStore } from './stores/useAuthStore';

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());


  useEffect(() => {
    if (isAuthenticated) {
      periodService.ensureCurrentYear().catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
