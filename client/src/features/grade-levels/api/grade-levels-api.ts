import { api } from '@/lib/api';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '@/types/api.types';

export interface GradeLevel {
  id: string;
  name: string;
  code: string;
}

export interface ListGradeLevelsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateGradeLevelInput {
  name: string;
  code: string;
}

export async function fetchGradeLevels(params: ListGradeLevelsParams = {}) {
  const { data } = await api.get<ApiPaginatedResponse<GradeLevel>>(
    '/grade-levels',
    { params },
  );
  return { items: data.data, meta: data.meta };
}

export async function createGradeLevel(
  input: CreateGradeLevelInput,
): Promise<GradeLevel> {
  const { data } = await api.post<ApiSuccessResponse<GradeLevel>>(
    '/grade-levels',
    input,
  );
  return data.data;
}

export async function updateGradeLevel(
  id: string,
  input: Partial<CreateGradeLevelInput>,
): Promise<GradeLevel> {
  const { data } = await api.patch<ApiSuccessResponse<GradeLevel>>(
    `/grade-levels/${id}`,
    input,
  );
  return data.data;
}

export async function fetchAllGradeLevels() {
  return fetchGradeLevels({ limit: 100, page: 1 });
}
