import type { UserRole } from '@/types/api.types';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: string;
}

export interface AuthSchool {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
}

export interface AuthSession {
  user: AuthUser;
  activeSchoolId: string | null;
  activeSchool: AuthSchool | null;
  impersonation: ImpersonationSession | null;
}

export type ImpersonationMode = 'read_only' | 'full';

export interface ImpersonationSession {
  targetSchoolId: string;
  targetSchoolName: string;
  impersonatedBy: string;
  mode: ImpersonationMode;
  startedAt: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}
