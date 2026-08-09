import { SummaryStatus } from '@prisma/client';

import {
  buildHomeroomPromotionReadiness,
  buildYearPromotionReadiness,
} from '@/modules/grade-summaries/year-promotion-finalization.util';
import type { YearPromotionReadiness } from '@/modules/grade-summaries/year-promotion-finalization.types';

export type YearPromotionReadinessContext = {
  academicYear: { id: string; name: string };
  hk1Id: string | null;
  hk2Id: string | null;
  homeroomClasses: Array<{ id: string; code: string }>;
  activeStudentCounts: Array<{ homeroomClassId: string; count: number }>;
  hk1ClosedSummaryCounts: Array<{ homeroomClassId: string; count: number }>;
  hk2ClosedSummaryCounts: Array<{ homeroomClassId: string; count: number }>;
  hk1ClosedConductCounts: Array<{ homeroomClassId: string; count: number }>;
  hk2ClosedConductCounts: Array<{ homeroomClassId: string; count: number }>;
  yearSummaryCounts: Array<{
    homeroomClassId: string;
    status: SummaryStatus;
    count: number;
  }>;
  pendingPromotionCounts: Array<{ homeroomClassId: string; count: number }>;
};

function toCountMap(rows: Array<{ homeroomClassId: string; count: number }>) {
  return new Map(rows.map((row) => [row.homeroomClassId, row.count]));
}

function buildSummaryCountMap(
  rows: YearPromotionReadinessContext['yearSummaryCounts'],
) {
  const map = new Map<
    string,
    { total: number; draft: number; closed: number }
  >();

  for (const row of rows) {
    const current = map.get(row.homeroomClassId) ?? {
      total: 0,
      draft: 0,
      closed: 0,
    };
    current.total += row.count;
    if (row.status === SummaryStatus.DRAFT) {
      current.draft += row.count;
    } else {
      current.closed += row.count;
    }
    map.set(row.homeroomClassId, current);
  }

  return map;
}

export function buildYearPromotionReadinessFromContext(
  context: YearPromotionReadinessContext,
): YearPromotionReadiness {
  const yearLevelIssues: string[] = [];

  if (!context.hk1Id) {
    yearLevelIssues.push('Năm học chưa có học kỳ 1');
  }

  if (!context.hk2Id) {
    yearLevelIssues.push('Năm học chưa có học kỳ 2');
  }

  if (context.homeroomClasses.length === 0) {
    return buildYearPromotionReadiness({
      academicYearId: context.academicYear.id,
      academicYearName: context.academicYear.name,
      homerooms: [],
      yearLevelIssues,
    });
  }

  const activeStudentCountMap = toCountMap(context.activeStudentCounts);
  const hk1ClosedSummaryMap = toCountMap(context.hk1ClosedSummaryCounts);
  const hk2ClosedSummaryMap = toCountMap(context.hk2ClosedSummaryCounts);
  const hk1ClosedConductMap = toCountMap(context.hk1ClosedConductCounts);
  const hk2ClosedConductMap = toCountMap(context.hk2ClosedConductCounts);
  const pendingPromotionMap = toCountMap(context.pendingPromotionCounts);
  const yearSummaryCountMap = buildSummaryCountMap(context.yearSummaryCounts);

  const homerooms = context.homeroomClasses.map((homeroom) => {
    const summaryStats = yearSummaryCountMap.get(homeroom.id) ?? {
      total: 0,
      draft: 0,
      closed: 0,
    };

    return buildHomeroomPromotionReadiness({
      homeroomClassId: homeroom.id,
      homeroomClassCode: homeroom.code,
      activeStudentCount: activeStudentCountMap.get(homeroom.id) ?? 0,
      hk1ClosedSummaryCount: hk1ClosedSummaryMap.get(homeroom.id) ?? 0,
      hk2ClosedSummaryCount: hk2ClosedSummaryMap.get(homeroom.id) ?? 0,
      hk1ClosedConductCount: hk1ClosedConductMap.get(homeroom.id) ?? 0,
      hk2ClosedConductCount: hk2ClosedConductMap.get(homeroom.id) ?? 0,
      yearSummaryCount: summaryStats.total,
      draftSummaryCount: summaryStats.draft,
      closedSummaryCount: summaryStats.closed,
      pendingPromotionCount: pendingPromotionMap.get(homeroom.id) ?? 0,
      hasHk1: context.hk1Id != null,
      hasHk2: context.hk2Id != null,
    });
  });

  return buildYearPromotionReadiness({
    academicYearId: context.academicYear.id,
    academicYearName: context.academicYear.name,
    homerooms,
    yearLevelIssues,
  });
}
