import type { UserRole, UserStatus } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  activeSchoolId: string;
}

export interface RefreshTokenPayload {
  sub: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  schoolId: string;
  activeSchoolId: string;
}

export interface AuthSessionData {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    status: UserStatus;
  };
  activeSchoolId: string;
  activeSchool: {
    id: string;
    code: string;
    name: string;
    shortName: string | null;
  };
}
