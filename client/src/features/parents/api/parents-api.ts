import { api } from '@/lib/api';
import type {
  AcademicEntityStatus,
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export type ParentRelationship = 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'OTHER';

export interface LinkedStudentSummary {
  id: string;
  studentId: string;
  studentFullName: string;
  relationship: ParentRelationship;
  isPrimaryContact: boolean;
}

export interface Parent {
  id: string;
  userId: string | null;
  userEmail: string | null;
  fullName: string;
  phone: string | null;
  status: AcademicEntityStatus;
  linkedStudents: LinkedStudentSummary[];
}

export interface ListParentsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AcademicEntityStatus;
}

export interface CreateParentInput {
  fullName: string;
  phone?: string;
  account?: { email: string; password: string };
}

export interface UpdateParentInput {
  fullName?: string;
  phone?: string | null;
}

export interface LinkParentStudentInput {
  studentId: string;
  relationship: ParentRelationship;
  isPrimaryContact?: boolean;
}

export async function fetchParents(params: ListParentsParams = {}) {
  const { data } = await api.get<ApiPaginatedResponse<Parent>>('/parents', {
    params,
  });
  return { items: data.data, meta: data.meta };
}

export async function fetchParent(id: string): Promise<Parent> {
  const { data } = await api.get<ApiSuccessResponse<Parent>>(`/parents/${id}`);
  return data.data;
}

export async function createParent(input: CreateParentInput): Promise<Parent> {
  const { data } = await api.post<ApiSuccessResponse<Parent>>('/parents', input);
  return data.data;
}

export async function updateParent(
  id: string,
  input: UpdateParentInput,
): Promise<Parent> {
  const { data } = await api.patch<ApiSuccessResponse<Parent>>(
    `/parents/${id}`,
    input,
  );
  return data.data;
}

export async function updateParentStatus(
  id: string,
  status: AcademicEntityStatus,
): Promise<Parent> {
  const { data } = await api.patch<ApiSuccessResponse<Parent>>(
    `/parents/${id}/status`,
    { status },
  );
  return data.data;
}

export async function createParentUser(
  id: string,
  input: { email: string; password: string },
): Promise<Parent> {
  const { data } = await api.post<ApiSuccessResponse<Parent>>(
    `/parents/${id}/create-user`,
    input,
  );
  return data.data;
}

export async function linkParentStudent(
  id: string,
  input: LinkParentStudentInput,
): Promise<Parent> {
  const { data } = await api.post<ApiSuccessResponse<Parent>>(
    `/parents/${id}/link-student`,
    input,
  );
  return data.data;
}

export async function unlinkParentStudent(
  parentId: string,
  studentId: string,
): Promise<Parent> {
  const { data } = await api.delete<ApiSuccessResponse<Parent>>(
    `/parents/${parentId}/students/${studentId}`,
  );
  return data.data;
}
