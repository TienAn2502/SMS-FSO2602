import type { UserRole, UserStatus } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      fullName: string;
      role: UserRole;
      status: UserStatus;
      schoolId: string | null;
      activeSchoolId: string;
      impersonatedBy?: string;
      impersonationMode?: 'read_only' | 'full';
    }
  }
}

export {};
