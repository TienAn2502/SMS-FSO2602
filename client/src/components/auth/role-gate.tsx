import type { ReactNode } from 'react';

import type { UserRole } from '@/types/api.types';
import { useAuth } from '@/features/auth/hooks/use-auth';

export function RoleGate({
  roles,
  children,
  fallback = (
    <div className='rounded-lg border border-border p-6 text-sm text-muted-foreground'>
      Bạn không có quyền truy cập trang này.
    </div>
  ),
}: {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { session } = useAuth();

  if (!session || !roles.includes(session.user.role)) {
    return fallback;
  }

  return children;
}
