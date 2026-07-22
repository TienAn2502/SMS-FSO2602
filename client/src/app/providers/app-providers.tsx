import { RouterProvider } from 'react-router';

import { AuthProvider } from '@/features/auth/context/auth-provider';

import { router } from '../router/router';
import { QueryProvider } from './query-provider';

export function AppProviders() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryProvider>
  );
}
