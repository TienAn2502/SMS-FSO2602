import { api } from '@/lib/api';
import type {
  AcademicEntityStatus,
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export interface TeachingAssignment {
  id: string;
  teacherId: string;
  teacherFullName: string;
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  semesterId: string;
  academicYearId: string;
  assignAt: string;
  endAt: string | null;
  status: AcademicEntityStatus;
}

export interface ListTeachingAssignmentsParams {
  page?: number;
  limit?: number;
  search?: string;
  teacherId?: string;
  courseSectionId?: string;
  semesterId?: string;
  academicYearId?: string;
  status?: AcademicEntityStatus;
  includeAllSemesters?: boolean;
}

export interface CreateTeachingAssignmentInput {
  teacherId: string;
  courseSectionId: string;
  assignAt: string;
}

export async function fetchTeachingAssignments(
  params: ListTeachingAssignmentsParams = {},
) {
  const { data } = await api.get<ApiPaginatedResponse<TeachingAssignment>>(
    '/teaching-assignments',
    { params },
  );
  return { items: data.data, meta: data.meta };
}

export async function createTeachingAssignment(
  input: CreateTeachingAssignmentInput,
): Promise<TeachingAssignment> {
  const { data } = await api.post<ApiSuccessResponse<TeachingAssignment>>(
    '/teaching-assignments',
    input,
  );
  return data.data;
}

export async function updateTeachingAssignmentStatus(
  id: string,
  status: AcademicEntityStatus,
  endAt?: string,
): Promise<TeachingAssignment> {
  const { data } = await api.patch<ApiSuccessResponse<TeachingAssignment>>(
    `/teaching-assignments/${id}/status`,
    { status, endAt },
  );
  return data.data;
}

export interface CopySemesterTeachingAssignmentsInput {
  sourceSemesterId: string;
  targetSemesterId: string;
}

export interface CopySemesterTeachingAssignmentsResult {
  sourceSemesterId: string;
  targetSemesterId: string;
  sourceSemesterCode: string;
  targetSemesterCode: string;
  sourceActiveCount: number;
  createdCount: number;
  skippedCount: number;
}

export async function copySemesterTeachingAssignments(
  input: CopySemesterTeachingAssignmentsInput,
): Promise<CopySemesterTeachingAssignmentsResult> {
  const { data } = await api.post<
    ApiSuccessResponse<CopySemesterTeachingAssignmentsResult>
  >('/teaching-assignments/copy-from-semester', input);
  return data.data;
}

export async function fetchTeacherTeachingAssignments(
  teacherId: string,
  params: ListTeachingAssignmentsParams = {},
) {
  const { data } = await api.get<ApiPaginatedResponse<TeachingAssignment>>(
    `/teachers/${teacherId}/teaching-assignments`,
    { params },
  );
  return { items: data.data, meta: data.meta };
}
