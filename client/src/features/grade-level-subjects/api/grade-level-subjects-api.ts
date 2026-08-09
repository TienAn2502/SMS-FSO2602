import { api } from '@/lib/api';
import type {
  AcademicEntityStatus,
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export type SubjectEvaluationMode = 'NUMERIC' | 'PASS_FAIL';

export interface GradeLevelSubject {
  id: string;
  gradeLevelId: string;
  gradeLevelCode: string;
  gradeLevelName: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  isRequired: boolean;
  periodsPerYear: number | null;
  evaluationMode: SubjectEvaluationMode;
  status: AcademicEntityStatus;
}

export interface ListGradeLevelSubjectsParams {
  page?: number;
  limit?: number;
  gradeLevelId?: string;
  subjectId?: string;
  status?: AcademicEntityStatus;
  sortBy?: 'gradeLevelCode' | 'subjectCode' | 'subjectName' | 'periodsPerYear' | 'evaluationMode';
  sortOrder?: 'asc' | 'desc';
}

export async function fetchGradeLevelSubjects(
  params: ListGradeLevelSubjectsParams = {},
) {
  const { data } = await api.get<ApiPaginatedResponse<GradeLevelSubject>>(
    '/grade-level-subjects',
    { params },
  );
  return { items: data.data, meta: data.meta };
}

export async function fetchGradeLevelSubject(
  id: string,
): Promise<GradeLevelSubject> {
  const { data } = await api.get<ApiSuccessResponse<GradeLevelSubject>>(
    `/grade-level-subjects/${id}`,
  );
  return data.data;
}

export async function updateGradeLevelSubject(
  id: string,
  input: {
    periodsPerYear?: number | null;
    isRequired?: boolean;
    evaluationMode?: SubjectEvaluationMode;
  },
): Promise<GradeLevelSubject> {
  const { data } = await api.patch<ApiSuccessResponse<GradeLevelSubject>>(
    `/grade-level-subjects/${id}`,
    input,
  );
  return data.data;
}

export async function fetchAllGradeLevelSubjects(gradeLevelId?: string) {
  return fetchGradeLevelSubjects({
    gradeLevelId,
    limit: 100,
    page: 1,
    sortBy: 'gradeLevelCode',
    sortOrder: 'asc',
  });
}

export const THPT_BGD_REGULATION = {
  circular: '13/2022/TT-BGDĐT',
  consolidated: '10/VBHN-BGDĐT (2023)',
} as const;

export const THPT_BGD_SPECIALIZED_CLUSTER_PERIODS = 35;

/** Nội dung cốt lõi (tiết/năm). */
export const THPT_BGD_CORE_PERIODS_REFERENCE: Record<string, number> = {
  TOAN: 105,
  VAN: 105,
  ANH: 105,
  SU: 52,
  TD: 70,
  GDQP: 35,
  DIA: 70,
  GKTPL: 70,
  LY: 70,
  HOA: 70,
  SINH: 70,
  CN: 70,
  TIN: 70,
  HDTN: 105,
};

export const THPT_BGD_PASS_FAIL_SUBJECTS = new Set(['TD', 'GDQP', 'HDTN']);

export function getThptBgdEvaluationModeReference(
  subjectCode: string,
): SubjectEvaluationMode {
  return THPT_BGD_PASS_FAIL_SUBJECTS.has(subjectCode) ? 'PASS_FAIL' : 'NUMERIC';
}

export const SUBJECT_EVALUATION_MODE_LABELS: Record<
  SubjectEvaluationMode,
  string
> = {
  NUMERIC: 'Điểm số',
  PASS_FAIL: 'Đạt / chưa đạt',
};

export const THPT_BGD_SPECIALIZED_CLUSTER_SUBJECTS = new Set([
  'TOAN',
  'VAN',
  'SU',
  'DIA',
  'GKTPL',
  'LY',
  'HOA',
  'SINH',
  'CN',
  'TIN',
]);

/** Cốt lõi + chuyên đề — giá trị seed mặc định cho `periods_per_year`. */
export function getThptBgdTotalPeriodsReference(subjectCode: string): number | null {
  const core = THPT_BGD_CORE_PERIODS_REFERENCE[subjectCode];
  if (core == null) {
    return null;
  }
  if (!THPT_BGD_SPECIALIZED_CLUSTER_SUBJECTS.has(subjectCode)) {
    return core;
  }
  return core + THPT_BGD_SPECIALIZED_CLUSTER_PERIODS;
}

/** @deprecated */
export const THPT_BGD_PERIODS_REFERENCE = THPT_BGD_CORE_PERIODS_REFERENCE;

/** @deprecated */
export function getThptBgdMaxPeriodsWithCluster(subjectCode: string): number | null {
  return getThptBgdTotalPeriodsReference(subjectCode);
}
