import type { UserRole, UserStatus } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      fullName: string;
      role: UserRole;
      status: UserStatus;
      schoolId: string;
      activeSchoolId: string;
    }
  }
}

export {};
