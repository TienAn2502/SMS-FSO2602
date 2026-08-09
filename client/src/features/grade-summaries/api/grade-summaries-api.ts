import { api } from '@/lib/api';
import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export type SummaryStatus = 'DRAFT' | 'CLOSED';
export type TrainingResultLevel =
  | 'GOOD'
  | 'FAIR'
  | 'SATISFACTORY'
  | 'UNSATISFACTORY';
export type AcademicResultLevel = TrainingResultLevel;
export type PromotionDecision =
  | 'PENDING'
  | 'PROMOTED'
  | 'RETAINED'
  | 'GRADUATED';

export interface SemesterSummaryItem {
  id: string;
  studentId: string;
  studentFullName: string;
  semesterId: string;
  semesterName: string;
  homeroomClassId: string;
  homeroomClassCode: string;
  overallAverage: number | null;
  academicResultLevel: AcademicResultLevel | null;
  trainingResultLevel: TrainingResultLevel | null;
  subjectCount: number | null;
  status: SummaryStatus;
  finalizedAt: string | null;
}

export interface YearSummaryItem {
  id: string;
  studentId: string;
  studentFullName: string;
  academicYearId: string;
  academicYearName: string;
  homeroomClassId: string;
  homeroomClassCode: string;
  gradeLevelCode: string;
  overallAverage: number | null;
  academicResultLevel: AcademicResultLevel | null;
  trainingResultLevel: TrainingResultLevel | null;
  promotionDecision: PromotionDecision;
  absentSessionCount: number | null;
  nextHomeroomClassId: string | null;
  nextHomeroomClassCode: string | null;
  note: string | null;
  status: SummaryStatus;
  finalizedAt: string | null;
}

export interface SubjectResultItem {
  id: string;
  studentId: string;
  studentFullName: string;
  courseSectionCode: string;
  subjectName: string;
  semesterName: string;
  semesterAverage: number | null;
  yearAverage: number | null;
  passFailResult: string | null;
  status: SummaryStatus;
}

export async function fetchSemesterSummaries(params: {
  page?: number;
  limit?: number;
  semesterId?: string;
  homeroomClassId?: string;
  status?: SummaryStatus;
  search?: string;
}) {
  const { data } = await api.get<ApiPaginatedResponse<SemesterSummaryItem>>(
    '/grade-summaries/semester-summaries',
    { params },
  );
  return { items: data.data, meta: data.meta };
}

export async function fetchYearSummaries(params: {
  page?: number;
  limit?: number;
  academicYearId?: string;
  homeroomClassId?: string;
  promotionDecision?: PromotionDecision;
  status?: SummaryStatus;
  search?: string;
}) {
  const { data } = await api.get<ApiPaginatedResponse<YearSummaryItem>>(
    '/grade-summaries/year-summaries',
    { params },
  );
  return { items: data.data, meta: data.meta };
}

export async function recomputeGradeSummaries(input: {
  semesterId: string;
  homeroomClassId?: string;
  courseSectionId?: string;
}) {
  const { data } = await api.post<
    ApiSuccessResponse<{
      subjectResultsUpserted: number;
      semesterSummariesUpserted: number;
      yearAveragesUpdated: number;
      skippedClosed: number;
    }>
  >('/grade-summaries/recompute', input);
  return data.data;
}

export async function finalizeSemesterSummaries(
  semesterId: string,
  homeroomClassId: string,
) {
  const { data } = await api.post<
    ApiSuccessResponse<{
      subjectResultsClosed: number;
      semesterSummariesClosed: number;
      conductRecordsClosed: number;
    }>
  >(`/grade-summaries/semesters/${semesterId}/finalize`, { homeroomClassId });
  return data.data;
}

export type SemesterFinalizeIssueCode =
  | 'OPEN_GRADEBOOKS'
  | 'MISSING_CONDUCT'
  | 'MISSING_SEMESTER_SUMMARY'
  | 'ALREADY_CLOSED';

export interface SemesterFinalizeIssueItem {
  code: SemesterFinalizeIssueCode;
  message: string;
  count?: number;
  courseSectionCodes?: string[];
}

export interface HomeroomFinalizeReadiness {
  homeroomClassId: string;
  homeroomClassCode: string;
  ready: boolean;
  issues: SemesterFinalizeIssueItem[];
}

export interface SemesterFinalizeReadiness {
  semesterId: string;
  semesterName: string;
  semesterCode: string;
  ready: boolean;
  alreadyClosed: boolean;
  totalHomeroomClasses: number;
  readyHomeroomClasses: number;
  homeroomIssues: HomeroomFinalizeReadiness[];
}

export async function fetchSemesterFinalizeReadiness(semesterId: string) {
  const { data } = await api.get<ApiSuccessResponse<SemesterFinalizeReadiness>>(
    `/grade-summaries/semesters/${semesterId}/finalize-readiness`,
  );
  return data.data;
}

export async function finalizeSemesterAll(semesterId: string) {
  const { data } = await api.post<
    ApiSuccessResponse<{
      subjectResultsClosed: number;
      semesterSummariesClosed: number;
      conductRecordsClosed: number;
      homeroomClassesProcessed: number;
    }>
  >(`/grade-summaries/semesters/${semesterId}/finalize-all`);
  return data.data;
}

export async function recomputeYearSummaries(
  academicYearId: string,
  homeroomClassId?: string,
) {
  const { data } = await api.post<
    ApiSuccessResponse<{
      yearSummariesUpserted: number;
      homeroomClassesProcessed?: number;
      hk1Id?: string | null;
      hk2Id?: string | null;
    }>
  >(`/grade-summaries/academic-years/${academicYearId}/recompute-year-summaries`, {
    ...(homeroomClassId ? { homeroomClassId } : {}),
  });
  return data.data;
}

export type YearPromotionIssueCode =
  | 'HK1_SEMESTER_NOT_CLOSED'
  | 'HK2_SEMESTER_NOT_CLOSED'
  | 'HK1_CONDUCT_NOT_CLOSED'
  | 'HK2_CONDUCT_NOT_CLOSED'
  | 'MISSING_YEAR_SUMMARY'
  | 'PENDING_PROMOTION'
  | 'ALREADY_CLOSED';

export interface YearPromotionIssueItem {
  code: YearPromotionIssueCode;
  message: string;
  count?: number;
}

export interface HomeroomPromotionReadiness {
  homeroomClassId: string;
  homeroomClassCode: string;
  ready: boolean;
  issues: YearPromotionIssueItem[];
}

export interface YearPromotionReadiness {
  academicYearId: string;
  academicYearName: string;
  ready: boolean;
  alreadyClosed: boolean;
  totalHomeroomClasses: number;
  readyHomeroomClasses: number;
  homeroomIssues: HomeroomPromotionReadiness[];
  yearLevelIssues: string[];
}

export async function fetchYearPromotionFinalizeReadiness(academicYearId: string) {
  const { data } = await api.get<ApiSuccessResponse<YearPromotionReadiness>>(
    `/grade-summaries/academic-years/${academicYearId}/finalize-promotion-readiness`,
  );
  return data.data;
}

export async function finalizePromotionAll(academicYearId: string) {
  const { data } = await api.post<
    ApiSuccessResponse<{
      yearSummariesClosed: number;
      homeroomClassesProcessed: number;
      studentsInactivated: number;
      parentsInactivated: number;
    }>
  >(`/grade-summaries/academic-years/${academicYearId}/finalize-promotion-all`);
  return data.data;
}

export async function finalizePromotion(
  academicYearId: string,
  input: { homeroomClassId: string },
) {
  const { data } = await api.post<
    ApiSuccessResponse<{
      yearSummariesClosed: number;
      studentsInactivated: number;
      parentsInactivated: number;
    }>
  >(
    `/grade-summaries/academic-years/${academicYearId}/finalize-promotion`,
    input,
  );
  return data.data;
}

export async function fetchConductRecords(params: {
  page?: number;
  limit?: number;
  semesterId: string;
  homeroomClassId?: string;
  status?: SummaryStatus;
  search?: string;
}) {
  const { data } = await api.get<
    ApiPaginatedResponse<{
      id: string;
      studentId: string;
      studentFullName: string;
      trainingResultLevel: TrainingResultLevel;
      note: string | null;
      status: SummaryStatus;
    }>
  >('/conduct-records', { params });
  return { items: data.data, meta: data.meta };
}
