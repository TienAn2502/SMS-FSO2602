import type { SubjectEvaluationMode } from '@prisma/client';

export const MIDTERM_ASSESSMENT_QUOTA = 1;
export const FINAL_ASSESSMENT_QUOTA = 1;
export const PASS_FAIL_REGULAR_QUOTA = 2;

export function getRegularAssessmentQuota(
  periodsPerYear: number | null | undefined,
  evaluationMode: SubjectEvaluationMode,
): number | null {
  if (evaluationMode === 'PASS_FAIL') {
    return PASS_FAIL_REGULAR_QUOTA;
  }

  if (periodsPerYear == null) {
    return null;
  }

  if (periodsPerYear <= 35) {
    return 2;
  }

  if (periodsPerYear <= 70) {
    return 3;
  }

  return 4;
}

/** Số cột TX cố định trên bảng điểm HS (luôn hiển thị đủ 4). */
export const STUDENT_SCORES_TX_COLUMN_COUNT = 4;

/** Số cột TX trên sổ điểm (= quota TX/năm theo periods_per_year). */
export function getGradebookRegularTxColumnCount(
  periodsPerYear: number | null | undefined,
  evaluationMode: SubjectEvaluationMode,
): number | null {
  return getRegularAssessmentQuota(periodsPerYear, evaluationMode);
}

/** @deprecated Số TX/HK — dùng getGradebookRegularTxColumnCount (quota năm = số cột). */
export function getRegularAssessmentQuotaPerSemester(
  periodsPerYear: number | null | undefined,
  evaluationMode: SubjectEvaluationMode,
): number | null {
  const yearly = getRegularAssessmentQuota(periodsPerYear, evaluationMode);
  if (yearly == null) {
    return null;
  }

  return Math.max(1, Math.ceil(yearly / 2));
}

export function getRegularQuotaDescription(
  periodsPerYear: number | null | undefined,
  evaluationMode: SubjectEvaluationMode,
  quota: number | null,
): string {
  if (evaluationMode === 'PASS_FAIL') {
    return 'Môn đạt/chưa đạt — tối đa 2 đầu điểm thường xuyên/năm học';
  }

  if (periodsPerYear == null || quota == null) {
    return 'Chưa cấu hình số tiết/năm cho môn theo khối';
  }

  return `${periodsPerYear} tiết/năm — tối đa ${quota} đầu điểm thường xuyên/năm học`;
}
