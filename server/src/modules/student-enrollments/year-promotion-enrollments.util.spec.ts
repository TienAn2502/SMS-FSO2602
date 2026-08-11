import { planYearPromotionEnrollments } from '@/modules/student-enrollments/year-promotion-enrollments.util';

describe('planYearPromotionEnrollments', () => {
  const targetYearId = 'year-next';

  it('creates enrollments only for PROMOTED; skips RETAINED and GRADUATED', () => {
    const plan = planYearPromotionEnrollments(
      [
        {
          studentId: 's1',
          promotionDecision: 'PROMOTED',
          nextHomeroomClassId: 'c1',
          nextHomeroomAcademicYearId: targetYearId,
        },
        {
          studentId: 's2',
          promotionDecision: 'RETAINED',
          nextHomeroomClassId: 'c2',
          nextHomeroomAcademicYearId: targetYearId,
        },
        {
          studentId: 's3',
          promotionDecision: 'GRADUATED',
          nextHomeroomClassId: null,
          nextHomeroomAcademicYearId: null,
        },
      ],
      targetYearId,
      new Set(),
    );

    expect(plan.eligibleCount).toBe(1);
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0]?.studentId).toBe('s1');
    expect(plan.retainedSkippedCount).toBe(1);
    expect(plan.graduatedSkippedCount).toBe(1);
    expect(plan.missingNextClassCount).toBe(0);
  });

  it('counts missing and invalid next classes and skips existing', () => {
    const plan = planYearPromotionEnrollments(
      [
        {
          studentId: 's1',
          promotionDecision: 'PROMOTED',
          nextHomeroomClassId: null,
          nextHomeroomAcademicYearId: null,
        },
        {
          studentId: 's2',
          promotionDecision: 'PROMOTED',
          nextHomeroomClassId: 'c-wrong',
          nextHomeroomAcademicYearId: 'year-other',
        },
        {
          studentId: 's3',
          promotionDecision: 'PROMOTED',
          nextHomeroomClassId: 'c3',
          nextHomeroomAcademicYearId: targetYearId,
        },
        {
          studentId: 's4',
          promotionDecision: 'RETAINED',
          nextHomeroomClassId: 'c4',
          nextHomeroomAcademicYearId: targetYearId,
        },
      ],
      targetYearId,
      new Set(['s3']),
    );

    expect(plan.eligibleCount).toBe(3);
    expect(plan.missingNextClassCount).toBe(1);
    expect(plan.invalidNextClassCount).toBe(1);
    expect(plan.skippedExistingCount).toBe(1);
    expect(plan.retainedSkippedCount).toBe(1);
    expect(plan.toCreate).toHaveLength(0);
  });
});
