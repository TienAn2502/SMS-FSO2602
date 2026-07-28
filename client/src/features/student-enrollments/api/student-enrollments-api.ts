import { api } from '@/lib/api';
import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export type EnrollmentStatus =
  | 'ACTIVE'
  | 'TRANSFERRED'
  | 'WITHDRAWN'
  | 'COMPLETED';

export interface StudentEnrollment {
  id: string;
  studentId: string;
  studentFullName: string;
  semesterId: string;
  semesterName: string;
  semesterCode: string;
  academicYearId: string;
  academicYearName: string;
  academicYearCode: string;
  homeroomClassId: string;
  homeroomClassName: string;
  homeroomClassCode: string;
  enrolledAt: string;
  leftAt: string | null;
  status: EnrollmentStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListStudentEnrollmentsParams {
  page?: number;
  limit?: number;
  semesterId?: string;
  academicYearId?: string;
  homeroomClassId?: string;
  status?: EnrollmentStatus;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateStudentEnrollmentInput {
  studentId: string;
  semesterId: string;
  homeroomClassId: string;
  enrolledAt: string;
  note?: string;
}

export interface TransferStudentEnrollmentInput {
  targetHomeroomClassId: string;
  transferredAt: string;
  note?: string;
}

export interface WithdrawStudentEnrollmentInput {
  leftAt?: string;
  note?: string;
}

export async function fetchStudentEnrollments(
  studentId: string,
  params: ListStudentEnrollmentsParams = {},
) {
  const { data } = await api.get<ApiPaginatedResponse<StudentEnrollment>>(
    `/students/${studentId}/enrollments`,
    { params },
  );
  return { items: data.data, meta: data.meta };
}

export async function createStudentEnrollment(
  input: CreateStudentEnrollmentInput,
): Promise<StudentEnrollment> {
  const { data } = await api.post<ApiSuccessResponse<StudentEnrollment>>(
    '/student-enrollments',
    input,
  );
  return data.data;
}

export async function transferStudentEnrollment(
  id: string,
  input: TransferStudentEnrollmentInput,
): Promise<StudentEnrollment> {
  const { data } = await api.post<ApiSuccessResponse<StudentEnrollment>>(
    `/student-enrollments/${id}/transfer`,
    input,
  );
  return data.data;
}

export async function withdrawStudentEnrollment(
  id: string,
  input: WithdrawStudentEnrollmentInput = {},
): Promise<StudentEnrollment> {
  const { data } = await api.patch<ApiSuccessResponse<StudentEnrollment>>(
    `/student-enrollments/${id}/withdraw`,
    input,
  );
  return data.data;
}
