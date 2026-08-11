import type { ReactNode } from 'react';

import type { UserRole } from '@/types/api.types';
import { useAuth } from '@/features/auth/hooks/use-auth';

function hasEffectiveRole(
  role: UserRole,
  required: UserRole[],
  isImpersonating: boolean,
) {
  if (required.includes(role)) {
    return true;
  }

  return isImpersonating && required.includes('SCHOOL_ADMIN');
}

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
  const isImpersonating = Boolean(session?.impersonation);

  if (
    !session ||
    !hasEffectiveRole(session.user.role, roles, isImpersonating)
  ) {
    return fallback;
  }

  return children;
}
