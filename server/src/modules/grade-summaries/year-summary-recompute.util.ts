import {
  PassFailResult,
  SummaryStatus,
  type AcademicResultLevel,
  type PromotionDecision,
  type TrainingResultLevel,
} from '@prisma/client';

import {
  computeYearOverallAverage,
  hasCompleteYearPromotionData,
  resolvePromotionDecision,
  resolveYearAcademicResultLevel,
  resolveYearTrainingResultLevel,
} from '@/common/utils/promotion.util';

type SemesterCode = 'HK1' | 'HK2';

export type YearSemesterRef = {
  id: string;
  code: string;
};

export type YearRecomputeContext = {
  homeroomClassId: string;
  isGraduatingGrade: boolean;
  studentIds: string[];
  semesterIds: string[];
  hk1: YearSemesterRef | undefined;
  hk2: YearSemesterRef | undefined;
};

export type YearRecomputeSemesterSummaryRow = {
  studentId: string;
  overallAverage: { toNumber(): number } | null;
  academicResultLevel: AcademicResultLevel | null;
  trainingResultLevel: TrainingResultLevel | null;
  status: SummaryStatus;
  semester: { code: string };
};

export type YearRecomputeConductRow = {
  studentId: string;
  semesterId: string;
  trainingResultLevel: TrainingResultLevel | null;
  status: SummaryStatus;
};

export type YearRecomputeIndexes = {
  absenceByStudentId: Map<string, number>;
  semesterSummariesByStudentId: Map<string, YearRecomputeSemesterSummaryRow[]>;
  conductByStudentSemesterId: Map<string, YearRecomputeConductRow>;
  yearSubjectAveragesByStudentId: Map<string, number[]>;
  passFailResultsByStudentId: Map<string, PassFailResult[]>;
  closedStudentIds: Set<string>;
};

export type DraftYearSummaryComputation = {
  overallAverage: number | null;
  academicResultLevel: AcademicResultLevel | null;
  trainingResultLevel: TrainingResultLevel | null;
  promotionDecision: PromotionDecision;
  absentSessionCount: number;
};

// Build thành các Map, Set để tối ưu việc tìm kiếm dữ liệu thay vì sử dụng array
export function buildYearRecomputeIndexes(input: {
  semesterSummaries: YearRecomputeSemesterSummaryRow[];
  conductRecords: YearRecomputeConductRow[];
  absenceGroups: Array<{ studentId: string; _count: { _all: number } }>;
  numericSubjectResults: Array<{
    studentId: string;
    yearAverage: { toNumber(): number } | null;
  }>;
  passFailSubjectResults: Array<{
    studentId: string;
    passFailResult: PassFailResult | null;
  }>;
  existingYearSummaries: Array<{ studentId: string; status: SummaryStatus }>;
}): YearRecomputeIndexes {
  const absenceByStudentId = new Map(
    input.absenceGroups.map((row) => [row.studentId, row._count._all]),
  );

  const semesterSummariesByStudentId = new Map<
    string,
    YearRecomputeSemesterSummaryRow[]
  >();
  for (const row of input.semesterSummaries) {
    const list = semesterSummariesByStudentId.get(row.studentId) ?? [];
    list.push(row);
    semesterSummariesByStudentId.set(row.studentId, list);
  }

  const conductByStudentSemesterId = new Map<string, YearRecomputeConductRow>();
  for (const row of input.conductRecords) {
    conductByStudentSemesterId.set(`${row.studentId}:${row.semesterId}`, row);
  }

  const yearSubjectAveragesByStudentId = new Map<string, number[]>();
  for (const row of input.numericSubjectResults) {
    const average = row.yearAverage?.toNumber();
    if (average == null) {
      continue;
    }

    const list = yearSubjectAveragesByStudentId.get(row.studentId) ?? [];
    list.push(average);
    yearSubjectAveragesByStudentId.set(row.studentId, list);
  }

  const passFailResultsByStudentId = new Map<string, PassFailResult[]>();
  for (const row of input.passFailSubjectResults) {
    if (row.passFailResult == null) {
      continue;
    }

    const list = passFailResultsByStudentId.get(row.studentId) ?? [];
    list.push(row.passFailResult);
    passFailResultsByStudentId.set(row.studentId, list);
  }

  const closedStudentIds = new Set(
    input.existingYearSummaries
      .filter((row) => row.status === SummaryStatus.CLOSED)
      .map((row) => row.studentId),
  );

  return {
    absenceByStudentId,
    semesterSummariesByStudentId,
    conductByStudentSemesterId,
    yearSubjectAveragesByStudentId,
    passFailResultsByStudentId,
    closedStudentIds,
  };
}

function findSemesterSummary(
  summaries: YearRecomputeSemesterSummaryRow[],
  semesterCode: SemesterCode,
) {
  return summaries.find((row) => row.semester.code === semesterCode);
}

export function computeDraftYearSummaryForStudent(input: {
  studentId: string;
  context: YearRecomputeContext;
  indexes: YearRecomputeIndexes;
}): DraftYearSummaryComputation | null {
  const { studentId, context, indexes } = input;

  if (indexes.closedStudentIds.has(studentId)) {
    return null;
  }

  const semesterSummaries =
    indexes.semesterSummariesByStudentId.get(studentId) ?? [];
  const hk1Summary = findSemesterSummary(semesterSummaries, 'HK1');
  const hk2Summary = findSemesterSummary(semesterSummaries, 'HK2');

  const hk1Conduct = context.hk1
    ? indexes.conductByStudentSemesterId.get(`${studentId}:${context.hk1.id}`)
    : undefined;
  const hk2Conduct = context.hk2
    ? indexes.conductByStudentSemesterId.get(`${studentId}:${context.hk2.id}`)
    : undefined;

  const hk1Average = hk1Summary?.overallAverage?.toNumber() ?? null;
  const hk2Average = hk2Summary?.overallAverage?.toNumber() ?? null;
  const yearOverallAverage = computeYearOverallAverage(hk1Average, hk2Average);

  const yearSubjectAverages =
    indexes.yearSubjectAveragesByStudentId.get(studentId) ?? [];

  const academicResultLevel = resolveYearAcademicResultLevel({
    hk1: hk1Summary?.academicResultLevel ?? null,
    hk2: hk2Summary?.academicResultLevel ?? null,
    yearOverallAverage,
    yearSubjectAverages,
    passFailResults: indexes.passFailResultsByStudentId.get(studentId) ?? [],
  });

  const trainingResultLevel = resolveYearTrainingResultLevel(
    hk1Conduct?.trainingResultLevel ?? hk1Summary?.trainingResultLevel ?? null,
    hk2Conduct?.trainingResultLevel ?? hk2Summary?.trainingResultLevel ?? null,
  );

  const hasCompleteYearData = hasCompleteYearPromotionData({
    hk1SemesterSummaryClosed: hk1Summary?.status === SummaryStatus.CLOSED,
    hk2SemesterSummaryClosed: hk2Summary?.status === SummaryStatus.CLOSED,
    hk1ConductClosed: hk1Conduct?.status === SummaryStatus.CLOSED,
    hk2ConductClosed: hk2Conduct?.status === SummaryStatus.CLOSED,
    yearOverallAverage,
  });

  const absentSessionCount = indexes.absenceByStudentId.get(studentId) ?? 0;

  const promotionDecision = resolvePromotionDecision({
    academicResultLevel,
    trainingResultLevel,
    yearOverallAverage,
    absentSessionCount,
    hasCompleteYearData,
    isGraduatingGrade: context.isGraduatingGrade,
  });

  return {
    overallAverage: yearOverallAverage,
    academicResultLevel,
    trainingResultLevel,
    promotionDecision,
    absentSessionCount,
  };
}
