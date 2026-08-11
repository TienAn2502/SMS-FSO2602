import { api } from '@/lib/api';
import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from '@/types/api.types';

export type SchoolStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type SchoolType = 'TH' | 'THCS' | 'THPT';

export interface PlatformAdminSummary {
  userId: string;
  email: string;
  fullName: string;
}

export interface PlatformSchoolAdmin {
  id: string;
  email: string;
  fullName: string;
  role: 'SCHOOL_ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  createdAt: string;
}

export interface CreatePlatformSchoolAdminInput {
  email: string;
  fullName: string;
  password: string;
}

export interface PlatformSchool {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
  schoolType: SchoolType | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logoFileId: string | null;
  status: SchoolStatus;
  createdAt: string;
  adminSummary: PlatformAdminSummary | null;
}

export interface PlatformSchoolDetail extends PlatformSchool {
  updatedAt: string;
  stats: {
    studentCount: number;
    teacherCount: number;
  };
}

export interface UpdatePlatformSchoolInput {
  name?: string;
  shortName?: string | null;
  schoolType?: SchoolType;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface CreatePlatformSchoolInput {
  code: string;
  name: string;
  shortName?: string;
  schoolType?: SchoolType;
  adminEmail: string;
  adminPassword: string;
  adminFullName?: string;
}

export interface FetchPlatformSchoolsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SchoolStatus;
}

export async function fetchPlatformSchools(params: FetchPlatformSchoolsParams) {
  const { data } = await api.get<ApiPaginatedResponse<PlatformSchool>>(
    '/platform/schools',
    { params },
  );

  return {
    items: data.data,
    meta: data.meta,
  };
}

export async function fetchPlatformSchoolCount() {
  const { data } = await api.get<ApiPaginatedResponse<PlatformSchool>>(
    '/platform/schools',
    { params: { page: 1, limit: 1 } },
  );

  return data.meta.total;
}

export async function fetchPlatformSchool(id: string) {
  const { data } = await api.get<ApiSuccessResponse<PlatformSchoolDetail>>(
    `/platform/schools/${id}`,
  );

  return data.data;
}

export async function updatePlatformSchool(
  id: string,
  input: UpdatePlatformSchoolInput,
) {
  const { data } = await api.patch<ApiSuccessResponse<PlatformSchoolDetail>>(
    `/platform/schools/${id}`,
    input,
  );

  return data.data;
}

export async function createPlatformSchool(input: CreatePlatformSchoolInput) {
  const { data } = await api.post<
    ApiSuccessResponse<{
      school: PlatformSchool;
      admin: { id: string; email: string; fullName: string; role: string };
      seededGradeLevelCount: number;
    }>
  >('/platform/schools', input);

  return data.data;
}

export async function updatePlatformSchoolStatus(
  id: string,
  status: SchoolStatus,
) {
  const { data } = await api.patch<ApiSuccessResponse<PlatformSchoolDetail>>(
    `/platform/schools/${id}/status`,
    { status },
  );

  return data.data;
}

export async function fetchPlatformSchoolAdmins(schoolId: string) {
  const { data } = await api.get<ApiSuccessResponse<PlatformSchoolAdmin[]>>(
    `/platform/schools/${schoolId}/admins`,
  );

  return data.data;
}

export async function createPlatformSchoolAdmin(
  schoolId: string,
  input: CreatePlatformSchoolAdminInput,
) {
  const { data } = await api.post<ApiSuccessResponse<PlatformSchoolAdmin>>(
    `/platform/schools/${schoolId}/admins`,
    input,
  );

  return data.data;
}

export type { PaginationMeta };
