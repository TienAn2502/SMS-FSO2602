import { RouterProvider } from 'react-router';

import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth/context/auth-provider';

import { router } from '../router/router';
import { QueryProvider } from './query-provider';

export function AppProviders() {
  return (
    <QueryProvider>
      <TooltipProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </TooltipProvider>
    </QueryProvider>
  );
}
