import type { UserRole, UserStatus } from '@prisma/client';

export type ImpersonationMode = 'read_only' | 'full';

export interface AccessTokenPayload {
  sub: string;
  /** Có khi user thuộc tenant hoặc SYSTEM_ADMIN đang impersonate. */
  activeSchoolId?: string;
  impersonatedBy?: string;
  impersonationMode?: ImpersonationMode;
}

export interface ImpersonationSessionData {
  targetSchoolId: string;
  targetSchoolName: string;
  impersonatedBy: string;
  mode: ImpersonationMode;
  startedAt: string;
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
  schoolId: string | null;
  /** Rỗng khi SYSTEM_ADMIN chưa impersonate / không thuộc tenant. */
  activeSchoolId: string;
  impersonatedBy?: string;
  impersonationMode?: ImpersonationMode;
}

export interface AuthSessionData {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    status: UserStatus;
  };
  activeSchoolId: string | null;
  activeSchool: {
    id: string;
    code: string;
    name: string;
    shortName: string | null;
  } | null;
  impersonation: ImpersonationSessionData | null;
}
