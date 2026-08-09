import { api } from '@/lib/api';
import type {
  AcademicEntityStatus,
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export interface AcademicYear {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: AcademicEntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  id: string;
  academicYearId: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: AcademicEntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListAcademicYearsParams {
  page?: number;
  limit?: number;
  status?: AcademicEntityStatus;
}

export interface CreateAcademicYearInput {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export interface CreateSemesterInput {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export interface UpdateSemesterInput {
  name?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
}

export async function fetchAcademicYears(
  params: ListAcademicYearsParams = {},
) {
  const { data } = await api.get<ApiPaginatedResponse<AcademicYear>>(
    '/academic-years',
    { params },
  );
  return { items: data.data, meta: data.meta };
}

export async function fetchAcademicYear(id: string): Promise<AcademicYear> {
  const { data } = await api.get<ApiSuccessResponse<AcademicYear>>(
    `/academic-years/${id}`,
  );
  return data.data;
}

export async function createAcademicYear(
  input: CreateAcademicYearInput,
): Promise<AcademicYear> {
  const { data } = await api.post<ApiSuccessResponse<AcademicYear>>(
    '/academic-years',
    input,
  );
  return data.data;
}

export async function setAcademicYearCurrent(
  id: string,
): Promise<AcademicYear> {
  const { data } = await api.patch<ApiSuccessResponse<AcademicYear>>(
    `/academic-years/${id}/set-current`,
  );
  return data.data;
}

export async function updateAcademicYearStatus(
  id: string,
  status: AcademicEntityStatus,
): Promise<AcademicYear> {
  const { data } = await api.patch<ApiSuccessResponse<AcademicYear>>(
    `/academic-years/${id}/status`,
    { status },
  );
  return data.data;
}

export async function fetchSemesters(yearId: string): Promise<Semester[]> {
  const { data } = await api.get<ApiSuccessResponse<Semester[]>>(
    `/academic-years/${yearId}/semesters`,
  );
  return data.data;
}

export async function fetchSemester(
  yearId: string,
  semesterId: string,
): Promise<Semester> {
  const { data } = await api.get<ApiSuccessResponse<Semester>>(
    `/academic-years/${yearId}/semesters/${semesterId}`,
  );
  return data.data;
}

export async function createSemester(
  yearId: string,
  input: CreateSemesterInput,
): Promise<Semester> {
  const { data } = await api.post<ApiSuccessResponse<Semester>>(
    `/academic-years/${yearId}/semesters`,
    input,
  );
  return data.data;
}

export async function updateSemester(
  yearId: string,
  semesterId: string,
  input: UpdateSemesterInput,
): Promise<Semester> {
  const { data } = await api.patch<ApiSuccessResponse<Semester>>(
    `/academic-years/${yearId}/semesters/${semesterId}`,
    input,
  );
  return data.data;
}

export async function setSemesterCurrent(
  yearId: string,
  semesterId: string,
): Promise<Semester> {
  const { data } = await api.patch<ApiSuccessResponse<Semester>>(
    `/academic-years/${yearId}/semesters/${semesterId}/set-current`,
  );
  return data.data;
}

export async function updateSemesterStatus(
  yearId: string,
  semesterId: string,
  status: AcademicEntityStatus,
): Promise<Semester> {
  const { data } = await api.patch<ApiSuccessResponse<Semester>>(
    `/academic-years/${yearId}/semesters/${semesterId}/status`,
    { status },
  );
  return data.data;
}

export interface SemesterPreparationCounts {
  enrollments: number;
  courseSections: number;
  teachingAssignments: number;
}

export interface SemesterPreparationStatus {
  sourceSemesterId: string;
  sourceSemesterCode: string;
  targetSemesterId: string;
  targetSemesterCode: string;
  source: SemesterPreparationCounts;
  target: SemesterPreparationCounts;
  enrollmentsReady: boolean;
  courseSectionsReady: boolean;
  teachingAssignmentsReady: boolean;
  isComplete: boolean;
}

export interface PrepareSemesterFromSourceInput {
  sourceSemesterId: string;
  closeSourceSemester?: boolean;
}

export interface PrepareSemesterFromSourceResult {
  courseSections: {
    createdCount: number;
    skippedCount: number;
    targetSemesterCode: string;
  };
  enrollments: {
    createdCount: number;
    skippedCount: number;
    sourceClosedCount: number;
    targetSemesterCode: string;
    sourceSemesterCode: string;
  };
  teachingAssignments: {
    createdCount: number;
    skippedCount: number;
    targetSemesterCode: string;
  };
  status: SemesterPreparationStatus;
}

export async function fetchSemesterPreparationStatus(
  yearId: string,
  targetSemesterId: string,
  sourceSemesterId: string,
): Promise<SemesterPreparationStatus> {
  const { data } = await api.get<ApiSuccessResponse<SemesterPreparationStatus>>(
    `/academic-years/${yearId}/semesters/${targetSemesterId}/preparation/status`,
    { params: { sourceSemesterId } },
  );
  return data.data;
}

export async function prepareSemesterFromSource(
  yearId: string,
  targetSemesterId: string,
  input: PrepareSemesterFromSourceInput,
): Promise<PrepareSemesterFromSourceResult> {
  const { data } = await api.post<
    ApiSuccessResponse<PrepareSemesterFromSourceResult>
  >(
    `/academic-years/${yearId}/semesters/${targetSemesterId}/preparation/prepare-from-source`,
    input,
  );
  return data.data;
}

export async function fetchAllAcademicYears() {
  return fetchAcademicYears({ limit: 100, page: 1 });
}
