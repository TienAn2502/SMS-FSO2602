import { api } from '@/lib/api';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface School {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
  schoolType: 'TH' | 'THCS' | 'THPT' | 'OTHER' | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
}

export interface UpdateSchoolInput {
  name?: string;
  shortName?: string | null;
  schoolType?: 'TH' | 'THCS' | 'THPT' | 'OTHER';
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export async function fetchCurrentSchool(): Promise<School> {
  const { data } = await api.get<ApiSuccessResponse<School>>('/schools/current');
  return data.data;
}

export async function updateCurrentSchool(
  input: UpdateSchoolInput,
): Promise<School> {
  const { data } = await api.patch<ApiSuccessResponse<School>>(
    '/schools/current',
    input,
  );
  return data.data;
}
