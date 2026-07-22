import type { ReactNode } from 'react';
import { Navigate } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuth } from '@/features/auth/hooks/use-auth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className='flex min-h-svh items-center justify-center'>
        <LoadingState message='Đang tải...' />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />;
  }

  return children;
}
