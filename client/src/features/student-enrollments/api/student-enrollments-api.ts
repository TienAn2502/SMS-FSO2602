import { api } from '@/lib/api';
import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export type EnrollmentStatus =
  | 'ACTIVE'
  | 'TRANSFERRED'
  | 'WITHDRAWN'
  | 'SEMESTER_COMPLETED'
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
  semesterIsCurrent: boolean;
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

export interface CopySemesterEnrollmentsInput {
  sourceSemesterId: string;
  targetSemesterId: string;
  enrolledAt?: string;
  note?: string;
  closeSourceSemester?: boolean;
}

export interface CopySemesterEnrollmentsResult {
  sourceSemesterId: string;
  targetSemesterId: string;
  sourceSemesterCode: string;
  targetSemesterCode: string;
  sourceActiveCount: number;
  createdCount: number;
  skippedCount: number;
  sourceClosedCount: number;
}

export interface CloseSemesterEnrollmentsInput {
  semesterId: string;
  leftAt?: string;
}

export interface CloseSemesterEnrollmentsResult {
  semesterId: string;
  semesterCode: string;
  closedCount: number;
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

export async function fetchStudentEnrollment(
  id: string,
): Promise<StudentEnrollment> {
  const { data } = await api.get<ApiSuccessResponse<StudentEnrollment>>(
    `/student-enrollments/${id}`,
  );
  return data.data;
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

export async function copySemesterEnrollments(
  input: CopySemesterEnrollmentsInput,
): Promise<CopySemesterEnrollmentsResult> {
  const { data } = await api.post<
    ApiSuccessResponse<CopySemesterEnrollmentsResult>
  >('/student-enrollments/copy-from-semester', input);
  return data.data;
}

export async function closeSemesterEnrollments(
  input: CloseSemesterEnrollmentsInput,
): Promise<CloseSemesterEnrollmentsResult> {
  const { data } = await api.post<
    ApiSuccessResponse<CloseSemesterEnrollmentsResult>
  >('/student-enrollments/close-semester', input);
  return data.data;
}

export interface SyncStaleEnrollmentsInput {
  academicYearId: string;
}

export interface SyncStaleEnrollmentsResult {
  academicYearId: string;
  closedCount: number;
  closedBySemester: Array<{
    semesterId: string;
    semesterCode: string;
    closedCount: number;
  }>;
}

export async function syncStaleEnrollments(
  input: SyncStaleEnrollmentsInput,
): Promise<SyncStaleEnrollmentsResult> {
  const { data } = await api.post<
    ApiSuccessResponse<SyncStaleEnrollmentsResult>
  >('/student-enrollments/sync-stale', input);
  return data.data;
}
