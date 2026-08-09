import type { PromotionDecision } from '@prisma/client';

export function pickGraduatedStudentIdsFromSummaries(
  summaries: ReadonlyArray<{
    studentId: string;
    promotionDecision: PromotionDecision;
  }>,
): string[] {
  const studentIds = new Set<string>();

  for (const summary of summaries) {
    if (summary.promotionDecision === 'GRADUATED') {
      studentIds.add(summary.studentId);
    }
  }

  return [...studentIds];
}
