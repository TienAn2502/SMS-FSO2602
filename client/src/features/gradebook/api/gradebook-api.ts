import { api } from '@/lib/api';
import type { PortalGradebookGrid } from '@/features/portal/api/portal-api';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '@/types/api.types';

export type AssessmentType = 'REGULAR' | 'MIDTERM' | 'FINAL';
export type AssessmentStatus = 'OPEN' | 'CLOSED';

export interface Assessment {
  id: string;
  semesterId: string;
  semesterName: string;
  academicYearId: string;
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  homeroomClassId: string | null;
  teacherId: string;
  teacherFullName: string;
  type: AssessmentType;
  name: string;
  assessmentDate: string;
  maxScore: number;
  weight: number | null;
  status: AssessmentStatus;
  note: string | null;
  scoreCount: number;
  scoredCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreSummary {
  id: string;
  studentId: string;
  studentFullName: string;
  score: number | null;
  note: string | null;
}

export interface AssessmentDetail extends Assessment {
  scores: ScoreSummary[];
}

export interface ListAssessmentsParams {
  page?: number;
  limit?: number;
  courseSectionId?: string;
  teacherId?: string;
  semesterId?: string;
  academicYearId?: string;
  homeroomClassId?: string;
  type?: AssessmentType;
  status?: AssessmentStatus;
  assessmentDateFrom?: string;
  assessmentDateTo?: string;
  sortBy?: 'assessmentDate' | 'name' | 'type' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export type GradebookOverviewStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'LOCKED';

export interface GradebookOverviewItem {
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  semesterId: string;
  semesterName: string;
  academicYearId: string;
  academicYearName: string;
  homeroomClassCode: string | null;
  subjectCode: string;
  subjectName: string;
  teacherId: string | null;
  teacherFullName: string | null;
  assessmentCount: number;
  expectedAssessmentCount: number;
  scoreCount: number;
  scoredCount: number;
  openAssessmentCount: number;
  gradebookStatus: GradebookOverviewStatus;
  isLocked: boolean;
}

export interface ListGradebookOverviewParams {
  page?: number;
  limit?: number;
  search?: string;
  semesterId?: string;
  academicYearId?: string;
  homeroomClassId?: string;
  subjectId?: string;
  teacherId?: string;
  gradebookStatus?: GradebookOverviewStatus;
  sortBy?: 'code' | 'name' | 'assessmentCount' | 'scoredCount';
  sortOrder?: 'asc' | 'desc';
}

export type GradebookGrid = PortalGradebookGrid;

export async function fetchAssessments(params: ListAssessmentsParams = {}) {
  const { data } = await api.get<ApiPaginatedResponse<Assessment>>(
    '/assessments',
    { params },
  );
  return data;
}

export async function fetchAssessment(id: string) {
  const { data } = await api.get<ApiSuccessResponse<AssessmentDetail>>(
    `/assessments/${id}`,
  );
  return data.data;
}

export async function fetchGradebookOverview(
  params: ListGradebookOverviewParams = {},
) {
  const { data } = await api.get<ApiPaginatedResponse<GradebookOverviewItem>>(
    '/assessments/overview',
    { params },
  );
  return data;
}

export async function fetchAdminGradebookGrid(courseSectionId: string) {
  const { data } = await api.get<ApiSuccessResponse<GradebookGrid>>(
    `/assessments/course-sections/${courseSectionId}/grid`,
  );
  return data.data;
}
