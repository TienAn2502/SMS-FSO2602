import type {
  HomeroomFinalizeReadiness,
  SemesterFinalizeIssueItem,
  SemesterFinalizeReadiness,
} from '@/modules/grade-summaries/semester-finalization.types';

export interface HomeroomFinalizeInput {
  homeroomClassId: string;
  homeroomClassCode: string;
  activeStudentCount: number;
  conductRecordCount: number;
  semesterSummaryCount: number;
  draftSummaryCount: number;
  closedSummaryCount: number;
  openGradebookSections: string[];
  notStartedGradebookSections: string[];
}

export function buildHomeroomFinalizeReadiness(
  input: HomeroomFinalizeInput,
): HomeroomFinalizeReadiness {
  const issues: SemesterFinalizeIssueItem[] = [];

  if (input.openGradebookSections.length > 0) {
    issues.push({
      code: 'OPEN_GRADEBOOKS',
      message: `${input.openGradebookSections.length} lớp môn chưa khóa sổ điểm`,
      count: input.openGradebookSections.length,
      courseSectionCodes: input.openGradebookSections,
    });
  }

  if (input.notStartedGradebookSections.length > 0) {
    issues.push({
      code: 'OPEN_GRADEBOOKS',
      message: `${input.notStartedGradebookSections.length} lớp môn chưa có sổ điểm`,
      count: input.notStartedGradebookSections.length,
      courseSectionCodes: input.notStartedGradebookSections,
    });
  }

  if (input.activeStudentCount > input.conductRecordCount) {
    const missing = input.activeStudentCount - input.conductRecordCount;
    issues.push({
      code: 'MISSING_CONDUCT',
      message: `Thiếu hạnh kiểm cho ${missing} học sinh`,
      count: missing,
    });
  }

  if (
    input.activeStudentCount > 0 &&
    input.semesterSummaryCount < input.activeStudentCount
  ) {
    const missing = input.activeStudentCount - input.semesterSummaryCount;
    issues.push({
      code: 'MISSING_SEMESTER_SUMMARY',
      message: `Thiếu tổng kết học kỳ cho ${missing} học sinh — hãy bấm Tái tính trước khi khóa`,
      count: missing,
    });
  }

  if (
    input.activeStudentCount > 0 &&
    input.draftSummaryCount === 0 &&
    input.closedSummaryCount === input.activeStudentCount
  ) {
    issues.push({
      code: 'ALREADY_CLOSED',
      message: 'Lớp đã khóa tổng kết học kỳ',
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

export function buildSemesterFinalizeReadiness(input: {
  semesterId: string;
  semesterName: string;
  semesterCode: string;
  homerooms: HomeroomFinalizeReadiness[];
}): SemesterFinalizeReadiness {
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
    input.homerooms.length > 0 &&
    readyHomeroomClasses === input.homerooms.length &&
    hasDraftToClose;

  return {
    semesterId: input.semesterId,
    semesterName: input.semesterName,
    semesterCode: input.semesterCode,
    ready,
    alreadyClosed: allClosed,
    totalHomeroomClasses: input.homerooms.length,
    readyHomeroomClasses,
    homeroomIssues,
  };
}
