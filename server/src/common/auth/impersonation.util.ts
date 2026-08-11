import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';

export function isImpersonating(user: AuthenticatedUser): boolean {
  return Boolean(
    user.activeSchoolId &&
    user.impersonatedBy &&
    user.impersonatedBy === user.id &&
    user.role === UserRole.SYSTEM_ADMIN,
  );
}

export function hasEffectiveRole(
  user: AuthenticatedUser,
  role: UserRole,
): boolean {
  if (user.role === role) {
    return true;
  }

  // System_admin đang xem và endpoint đó có dành cho school_admin không
  return isImpersonating(user) && role === UserRole.SCHOOL_ADMIN;
}
