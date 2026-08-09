import {
  buildHomeroomPromotionReadiness,
  buildYearPromotionReadiness,
} from '@/modules/grade-summaries/year-promotion-finalization.util';
import { buildYearPromotionReadinessFromContext } from '@/modules/grade-summaries/year-promotion-finalization-readiness.util';
import { SummaryStatus } from '@prisma/client';

describe('year-promotion-finalization.util', () => {
  it('marks homeroom not ready when HK2 semester summaries not closed', () => {
    const result = buildHomeroomPromotionReadiness({
      homeroomClassId: 'hr-1',
      homeroomClassCode: '10A1',
      activeStudentCount: 30,
      hk1ClosedSummaryCount: 30,
      hk2ClosedSummaryCount: 28,
      hk1ClosedConductCount: 30,
      hk2ClosedConductCount: 30,
      yearSummaryCount: 30,
      draftSummaryCount: 30,
      closedSummaryCount: 0,
      pendingPromotionCount: 0,
      hasHk1: true,
      hasHk2: true,
    });

    expect(result.ready).toBe(false);
    expect(result.issues[0]?.code).toBe('HK2_SEMESTER_NOT_CLOSED');
  });

  it('is ready when all checks pass and draft summaries exist', () => {
    const result = buildYearPromotionReadiness({
      academicYearId: 'year-1',
      academicYearName: '2025-2026',
      homerooms: [
        buildHomeroomPromotionReadiness({
          homeroomClassId: 'hr-1',
          homeroomClassCode: '10A1',
          activeStudentCount: 30,
          hk1ClosedSummaryCount: 30,
          hk2ClosedSummaryCount: 30,
          hk1ClosedConductCount: 30,
          hk2ClosedConductCount: 30,
          yearSummaryCount: 30,
          draftSummaryCount: 30,
          closedSummaryCount: 0,
          pendingPromotionCount: 0,
          hasHk1: true,
          hasHk2: true,
        }),
      ],
    });

    expect(result.ready).toBe(true);
    expect(result.alreadyClosed).toBe(false);
  });
});

describe('year-promotion-finalization-readiness.util', () => {
  it('builds readiness from loaded context', () => {
    const result = buildYearPromotionReadinessFromContext({
      academicYear: { id: 'year-1', name: '2025-2026' },
      hk1Id: 'hk1',
      hk2Id: 'hk2',
      homeroomClasses: [{ id: 'hr-1', code: '10A1' }],
      activeStudentCounts: [{ homeroomClassId: 'hr-1', count: 30 }],
      hk1ClosedSummaryCounts: [{ homeroomClassId: 'hr-1', count: 30 }],
      hk2ClosedSummaryCounts: [{ homeroomClassId: 'hr-1', count: 30 }],
      hk1ClosedConductCounts: [{ homeroomClassId: 'hr-1', count: 30 }],
      hk2ClosedConductCounts: [{ homeroomClassId: 'hr-1', count: 30 }],
      yearSummaryCounts: [
        { homeroomClassId: 'hr-1', status: SummaryStatus.DRAFT, count: 30 },
      ],
      pendingPromotionCounts: [{ homeroomClassId: 'hr-1', count: 2 }],
    });

    expect(result.ready).toBe(false);
    expect(result.homeroomIssues[0]?.issues[0]?.code).toBe('PENDING_PROMOTION');
  });
});
