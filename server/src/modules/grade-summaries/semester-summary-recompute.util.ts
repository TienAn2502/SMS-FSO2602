import {
  PassFailResult,
  SubjectEvaluationMode,
  type AcademicResultLevel,
  type TrainingResultLevel,
} from '@prisma/client';

import {
  computeOverallAverage,
  resolveAcademicResultLevel,
} from '@/common/utils/gradebook-average.util';

export type SubjectResultSummaryInput = {
  evaluationMode: SubjectEvaluationMode;
  semesterAverage: { toNumber(): number } | null;
  passFailResult: PassFailResult | null;
};

export function computeSemesterSummaryFields(
  subjectResults: SubjectResultSummaryInput[],
  trainingResultLevel: TrainingResultLevel | null | undefined,
): {
  overallAverage: number | null;
  academicResultLevel: AcademicResultLevel | null;
  trainingResultLevel: TrainingResultLevel | null;
  subjectCount: number;
} {
  const subjectAverages = subjectResults
    .filter(
      (row) =>
        row.evaluationMode === SubjectEvaluationMode.NUMERIC &&
        row.semesterAverage != null,
    )
    .map((row) => row.semesterAverage!.toNumber());

  const passFailResults = subjectResults
    .filter((row) => row.evaluationMode === SubjectEvaluationMode.PASS_FAIL)
    .map((row) => row.passFailResult)
    .filter((result): result is PassFailResult => result != null);

  const overallAverage = computeOverallAverage(subjectAverages);
  const academicResultLevel = resolveAcademicResultLevel({
    numericSubjectAverages: subjectAverages,
    passFailResults,
  });

  return {
    overallAverage,
    academicResultLevel,
    trainingResultLevel: trainingResultLevel ?? null,
    subjectCount: subjectAverages.length,
  };
}
