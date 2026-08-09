import { api } from '@/lib/api';
import type { TimetableEntry } from '@/features/timetable/api/timetable-entries-api';
import type {
  AcademicEntityStatus,
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export interface CourseSection {
  id: string;
  semesterId: string;
  academicYearId: string;
  homeroomClassId: string | null;
  gradeLevelSubjectId: string;
  name: string;
  code: string;
  status: AcademicEntityStatus;
  createdAt: string;
  updatedAt: string;
}

export const ALL_ACADEMIC_PERIODS = 'all' as const;

export interface ListCourseSectionsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AcademicEntityStatus;
  semesterId?: string;
  academicYearId?: string;
  homeroomClassId?: string;
  subjectId?: string;
}

export interface CreateCourseSectionInput {
  semesterId: string;
  subjectId: string;
  homeroomClassId?: string | null;
  gradeLevelId?: string;
  name: string;
  code: string;
}

export interface UpdateCourseSectionInput {
  name?: string;
  code?: string;
  homeroomClassId?: string | null;
}

export async function fetchCourseSections(
  params: ListCourseSectionsParams = {},
) {
  const { data } = await api.get<ApiPaginatedResponse<CourseSection>>(
    '/course-sections',
    { params },
  );
  return { items: data.data, meta: data.meta };
}

export async function fetchCourseSection(id: string): Promise<CourseSection> {
  const { data } = await api.get<ApiSuccessResponse<CourseSection>>(
    `/course-sections/${id}`,
  );
  return data.data;
}

export async function createCourseSection(
  input: CreateCourseSectionInput,
): Promise<CourseSection> {
  const { data } = await api.post<ApiSuccessResponse<CourseSection>>(
    '/course-sections',
    input,
  );
  return data.data;
}

export async function updateCourseSection(
  id: string,
  input: UpdateCourseSectionInput,
): Promise<CourseSection> {
  const { data } = await api.patch<ApiSuccessResponse<CourseSection>>(
    `/course-sections/${id}`,
    input,
  );
  return data.data;
}

export async function updateCourseSectionStatus(
  id: string,
  status: AcademicEntityStatus,
): Promise<CourseSection> {
  const { data } = await api.patch<ApiSuccessResponse<CourseSection>>(
    `/course-sections/${id}/status`,
    { status },
  );
  return data.data;
}

export interface CopySemesterCourseSectionsInput {
  sourceSemesterId: string;
  targetSemesterId: string;
}

export interface CopySemesterCourseSectionsResult {
  sourceSemesterId: string;
  targetSemesterId: string;
  sourceSemesterCode: string;
  targetSemesterCode: string;
  sourceActiveCount: number;
  createdCount: number;
  skippedCount: number;
}

export async function copySemesterCourseSections(
  input: CopySemesterCourseSectionsInput,
): Promise<CopySemesterCourseSectionsResult> {
  const { data } = await api.post<
    ApiSuccessResponse<CopySemesterCourseSectionsResult>
  >('/course-sections/copy-from-semester', input);
  return data.data;
}

export async function fetchCourseSectionTimetableEntries(
  courseSectionId: string,
  params: {
    page?: number;
    limit?: number;
    semesterId?: string;
    includeAllSemesters?: boolean;
  } = {},
) {
  const { data } = await api.get<ApiPaginatedResponse<TimetableEntry>>(
    `/course-sections/${courseSectionId}/timetable-entries`,
    { params },
  );
  return { items: data.data, meta: data.meta };
}
