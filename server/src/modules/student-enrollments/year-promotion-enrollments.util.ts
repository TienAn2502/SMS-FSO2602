import type { PromotionDecision } from '@prisma/client';

export type YearPromotionEnrollmentCandidate = {
  studentId: string;
  promotionDecision: PromotionDecision;
  nextHomeroomClassId: string | null;
  nextHomeroomAcademicYearId: string | null;
};

export type YearPromotionEnrollmentPlan = {
  eligibleCount: number;
  toCreate: Array<{ studentId: string; homeroomClassId: string }>;
  skippedExistingCount: number;
  missingNextClassCount: number;
  invalidNextClassCount: number;
  graduatedSkippedCount: number;
  retainedSkippedCount: number;
};

/**
 * Phân loại HS từ tổng kết năm để tạo ghi danh năm sau.
 * Chỉ PROMOTED được ghi danh; RETAINED / GRADUATED bỏ qua.
 * `candidates` nên gồm mọi summary CLOSED liên quan (để đếm skip).
 */
export function planYearPromotionEnrollments(
  candidates: YearPromotionEnrollmentCandidate[],
  targetAcademicYearId: string,
  existingActiveStudentIds: ReadonlySet<string>,
): YearPromotionEnrollmentPlan {
  let eligibleCount = 0;
  let skippedExistingCount = 0;
  let missingNextClassCount = 0;
  let invalidNextClassCount = 0;
  let graduatedSkippedCount = 0;
  let retainedSkippedCount = 0;
  const toCreate: Array<{ studentId: string; homeroomClassId: string }> = [];

  for (const candidate of candidates) {
    if (candidate.promotionDecision === 'GRADUATED') {
      graduatedSkippedCount += 1;
      continue;
    }

    if (candidate.promotionDecision === 'RETAINED') {
      retainedSkippedCount += 1;
      continue;
    }

    if (candidate.promotionDecision !== 'PROMOTED') {
      continue;
    }

    eligibleCount += 1;

    if (!candidate.nextHomeroomClassId) {
      missingNextClassCount += 1;
      continue;
    }

    if (candidate.nextHomeroomAcademicYearId !== targetAcademicYearId) {
      invalidNextClassCount += 1;
      continue;
    }

    if (existingActiveStudentIds.has(candidate.studentId)) {
      skippedExistingCount += 1;
      continue;
    }

    toCreate.push({
      studentId: candidate.studentId,
      homeroomClassId: candidate.nextHomeroomClassId,
    });
  }

  return {
    eligibleCount,
    toCreate,
    skippedExistingCount,
    missingNextClassCount,
    invalidNextClassCount,
    graduatedSkippedCount,
    retainedSkippedCount,
  };
}
