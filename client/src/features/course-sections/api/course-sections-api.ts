import { api } from '@/lib/api';
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

export async function fetchCourseSections(
  params: ListCourseSectionsParams = {},
) {
  const { data } = await api.get<ApiPaginatedResponse<CourseSection>>(
    '/course-sections',
    { params },
  );
  return { items: data.data, meta: data.meta };
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
