import type {
  HomeroomPromotionReadiness,
  YearPromotionIssueItem,
  YearPromotionReadiness,
} from '@/modules/grade-summaries/year-promotion-finalization.types';

export interface HomeroomPromotionReadinessInput {
  homeroomClassId: string;
  homeroomClassCode: string;
  activeStudentCount: number;
  hk1ClosedSummaryCount: number;
  hk2ClosedSummaryCount: number;
  hk1ClosedConductCount: number;
  hk2ClosedConductCount: number;
  yearSummaryCount: number;
  draftSummaryCount: number;
  closedSummaryCount: number;
  pendingPromotionCount: number;
  hasHk1: boolean;
  hasHk2: boolean;
}

export function buildHomeroomPromotionReadiness(
  input: HomeroomPromotionReadinessInput,
): HomeroomPromotionReadiness {
  const issues: YearPromotionIssueItem[] = [];

  if (input.hasHk1 && input.activeStudentCount > input.hk1ClosedSummaryCount) {
    const missing = input.activeStudentCount - input.hk1ClosedSummaryCount;
    issues.push({
      code: 'HK1_SEMESTER_NOT_CLOSED',
      message: `HK1: thiếu ${missing} tổng kết học kỳ đã khóa`,
      count: missing,
    });
  }

  if (input.hasHk2 && input.activeStudentCount > input.hk2ClosedSummaryCount) {
    const missing = input.activeStudentCount - input.hk2ClosedSummaryCount;
    issues.push({
      code: 'HK2_SEMESTER_NOT_CLOSED',
      message: `HK2: thiếu ${missing} tổng kết học kỳ đã khóa`,
      count: missing,
    });
  }

  if (input.hasHk1 && input.activeStudentCount > input.hk1ClosedConductCount) {
    const missing = input.activeStudentCount - input.hk1ClosedConductCount;
    issues.push({
      code: 'HK1_CONDUCT_NOT_CLOSED',
      message: `HK1: thiếu ${missing} hạnh kiểm đã khóa`,
      count: missing,
    });
  }

  if (input.hasHk2 && input.activeStudentCount > input.hk2ClosedConductCount) {
    const missing = input.activeStudentCount - input.hk2ClosedConductCount;
    issues.push({
      code: 'HK2_CONDUCT_NOT_CLOSED',
      message: `HK2: thiếu ${missing} hạnh kiểm đã khóa`,
      count: missing,
    });
  }

  if (
    input.activeStudentCount > 0 &&
    input.yearSummaryCount < input.activeStudentCount
  ) {
    const missing = input.activeStudentCount - input.yearSummaryCount;
    issues.push({
      code: 'MISSING_YEAR_SUMMARY',
      message: `Thiếu tổng kết năm cho ${missing} học sinh — hãy bấm Tái tính năm trước`,
      count: missing,
    });
  }

  if (input.pendingPromotionCount > 0) {
    issues.push({
      code: 'PENDING_PROMOTION',
      message: `${input.pendingPromotionCount} học sinh chưa đủ dữ liệu xét lên lớp`,
      count: input.pendingPromotionCount,
    });
  }

  if (
    input.activeStudentCount > 0 &&
    input.draftSummaryCount === 0 &&
    input.closedSummaryCount === input.activeStudentCount
  ) {
    issues.push({
      code: 'ALREADY_CLOSED',
      message: 'Lớp đã chốt lên lớp',
    });
  }

  const blockingIssues = issues.filter((issue) => issue.code !== 'ALREADY_CLOSED');

  return {
    homeroomClassId: input.homeroomClassId,
    homeroomClassCode: input.homeroomClassCode,
    ready: blockingIssues.length === 0,
    issues,
  };
}

export function buildYearPromotionReadiness(input: {
  academicYearId: string;
  academicYearName: string;
  homerooms: HomeroomPromotionReadiness[];
  yearLevelIssues?: string[];
}): YearPromotionReadiness {
  const yearLevelIssues = input.yearLevelIssues ?? [];
  const homeroomIssues = input.homerooms.filter((row) => row.issues.length > 0);
  const readyHomeroomClasses = input.homerooms.filter((row) => row.ready).length;
  const allClosed =
    input.homerooms.length > 0 &&
    input.homerooms.every((row) =>
      row.issues.some((issue) => issue.code === 'ALREADY_CLOSED'),
    );
  const hasDraftToClose = input.homerooms.some((row) =>
    row.issues.every((issue) => issue.code !== 'ALREADY_CLOSED'),
  );

  const ready =
    yearLevelIssues.length === 0 &&
    input.homerooms.length > 0 &&
    readyHomeroomClasses === input.homerooms.length &&
    hasDraftToClose;

  return {
    academicYearId: input.academicYearId,
    academicYearName: input.academicYearName,
    ready,
    alreadyClosed: allClosed,
    totalHomeroomClasses: input.homerooms.length,
    readyHomeroomClasses,
    homeroomIssues,
    yearLevelIssues,
  };
}
