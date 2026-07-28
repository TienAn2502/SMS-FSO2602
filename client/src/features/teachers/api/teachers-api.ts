import { api } from '@/lib/api';
import type {
  AcademicEntityStatus,
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface TeachingAssignmentSummary {
  id: string;
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  assignAt: string;
  endAt: string | null;
  status: AcademicEntityStatus;
}

export interface Teacher {
  id: string;
  userId: string | null;
  userEmail: string | null;
  fullName: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  phone: string | null;
  address: string | null;
  specialization: string | null;
  avatarFileId: string | null;
  status: AcademicEntityStatus;
  teachingAssignments: TeachingAssignmentSummary[];
}

export interface ListTeachersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AcademicEntityStatus;
}

export interface CreateTeacherInput {
  fullName: string;
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  address?: string;
  specialization?: string;
  account?: { email: string; password: string };
}

export interface UpdateTeacherInput {
  fullName?: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  phone?: string | null;
  address?: string | null;
  specialization?: string | null;
}

export async function fetchTeachers(params: ListTeachersParams = {}) {
  const { data } = await api.get<ApiPaginatedResponse<Teacher>>('/teachers', {
    params,
  });
  return { items: data.data, meta: data.meta };
}

export async function fetchAllTeachers() {
  const { items } = await fetchTeachers({ limit: 100, status: 'ACTIVE' });
  return items;
}

export async function fetchTeacher(id: string): Promise<Teacher> {
  const { data } = await api.get<ApiSuccessResponse<Teacher>>(`/teachers/${id}`);
  return data.data;
}

export async function createTeacher(input: CreateTeacherInput): Promise<Teacher> {
  const { data } = await api.post<ApiSuccessResponse<Teacher>>('/teachers', input);
  return data.data;
}

export async function updateTeacher(
  id: string,
  input: UpdateTeacherInput,
): Promise<Teacher> {
  const { data } = await api.patch<ApiSuccessResponse<Teacher>>(
    `/teachers/${id}`,
    input,
  );
  return data.data;
}

export async function updateTeacherStatus(
  id: string,
  status: AcademicEntityStatus,
): Promise<Teacher> {
  const { data } = await api.patch<ApiSuccessResponse<Teacher>>(
    `/teachers/${id}/status`,
    { status },
  );
  return data.data;
}

export async function createTeacherUser(
  id: string,
  input: { email: string; password: string },
): Promise<Teacher> {
  const { data } = await api.post<ApiSuccessResponse<Teacher>>(
    `/teachers/${id}/create-user`,
    input,
  );
  return data.data;
}
