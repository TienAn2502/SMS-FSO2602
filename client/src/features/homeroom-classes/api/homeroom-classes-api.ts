import { api } from '@/lib/api';
import type {
  AcademicEntityStatus,
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export interface HomeroomClass {
  id: string;
  academicYearId: string;
  gradeLevelId: string;
  name: string;
  code: string;
  capacity: number | null;
  homeroomTeacherId: string | null;
  status: AcademicEntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListHomeroomClassesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AcademicEntityStatus;
  academicYearId?: string;
  gradeLevelId?: string;
}

export interface CreateHomeroomClassInput {
  academicYearId: string;
  gradeLevelId: string;
  name: string;
  code: string;
  capacity?: number;
  homeroomTeacherId?: string | null;
}

export interface UpdateHomeroomClassInput {
  name?: string;
  code?: string;
  capacity?: number | null;
  homeroomTeacherId?: string | null;
}

export async function fetchHomeroomClasses(
  params: ListHomeroomClassesParams = {},
) {
  const { data } = await api.get<ApiPaginatedResponse<HomeroomClass>>(
    '/homeroom-classes',
    { params },
  );
  return { items: data.data, meta: data.meta };
}

export async function fetchHomeroomClass(id: string): Promise<HomeroomClass> {
  const { data } = await api.get<ApiSuccessResponse<HomeroomClass>>(
    `/homeroom-classes/${id}`,
  );
  return data.data;
}

export async function createHomeroomClass(
  input: CreateHomeroomClassInput,
): Promise<HomeroomClass> {
  const { data } = await api.post<ApiSuccessResponse<HomeroomClass>>(
    '/homeroom-classes',
    input,
  );
  return data.data;
}

export async function updateHomeroomClass(
  id: string,
  input: UpdateHomeroomClassInput,
): Promise<HomeroomClass> {
  const { data } = await api.patch<ApiSuccessResponse<HomeroomClass>>(
    `/homeroom-classes/${id}`,
    input,
  );
  return data.data;
}

export async function updateHomeroomClassStatus(
  id: string,
  status: AcademicEntityStatus,
): Promise<HomeroomClass> {
  const { data } = await api.patch<ApiSuccessResponse<HomeroomClass>>(
    `/homeroom-classes/${id}/status`,
    { status },
  );
  return data.data;
}
