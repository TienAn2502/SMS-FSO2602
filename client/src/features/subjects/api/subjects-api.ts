import { api } from '@/lib/api';
import type {
  AcademicEntityStatus,
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export interface Subject {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: AcademicEntityStatus;
}

export interface ListSubjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AcademicEntityStatus;
}

export interface CreateSubjectInput {
  code: string;
  name: string;
  description?: string;
}

export async function fetchSubjects(params: ListSubjectsParams = {}) {
  const { data } = await api.get<ApiPaginatedResponse<Subject>>('/subjects', {
    params,
  });
  return { items: data.data, meta: data.meta };
}

export async function createSubject(input: CreateSubjectInput): Promise<Subject> {
  const { data } = await api.post<ApiSuccessResponse<Subject>>(
    '/subjects',
    input,
  );
  return data.data;
}

export async function updateSubjectStatus(
  id: string,
  status: AcademicEntityStatus,
): Promise<Subject> {
  const { data } = await api.patch<ApiSuccessResponse<Subject>>(
    `/subjects/${id}/status`,
    { status },
  );
  return data.data;
}

export async function fetchAllSubjects() {
  return fetchSubjects({ limit: 100, page: 1, status: 'ACTIVE' });
}
