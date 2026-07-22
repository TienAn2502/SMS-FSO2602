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
  activeSchoolId: string;
  activeSchool: AuthSchool;
}

export interface LoginInput {
  email: string;
  password: string;
}
