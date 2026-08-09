import {
  AssessmentType,
  PassFailResult,
  type AcademicResultLevel,
} from '@prisma/client';

export interface SubjectScoreInput {
  type: AssessmentType;
  score: number | null;
  note?: string | null;
}

export interface SubjectSemesterAverageResult {
  regularAverage: number | null;
  midtermScore: number | null;
  finalScore: number | null;
  semesterAverage: number | null;
}

export const PASS_FAIL_PASS_THRESHOLD = 5;

/** Số môn tối thiểu đạt ngưỡng — theo TT22/2021 (MVP THPT). */
export const MIN_NUMERIC_SUBJECTS_FOR_ACADEMIC_LEVEL = 6;

export interface AcademicResultInput {
  numericSubjectAverages: number[];
  passFailResults?: PassFailResult[];
}

export function isAbsentScoreCell(
  score: number | null,
  note: string | null | undefined,
  type: AssessmentType,
): boolean {
  if (score != null) {
    return false;
  }

  if (type !== AssessmentType.MIDTERM && type !== AssessmentType.FINAL) {
    return false;
  }

  return Boolean(note?.trim());
}

export function isGradebookScoreCellComplete(
  score: number | null,
  _note: string | null | undefined,
  _type: AssessmentType,
): boolean {
  return score != null;
}

export function roundGradeAverage(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeRegularAverage(
  inputs: SubjectScoreInput[],
): number | null {
  const regularScores = inputs
    .filter((input) => input.type === AssessmentType.REGULAR)
    .map((input) => input.score)
    .filter((score): score is number => score != null);

  if (regularScores.length === 0) {
    return null;
  }

  const sum = regularScores.reduce((total, score) => total + score, 0);
  return roundGradeAverage(sum / regularScores.length);
}

export function computeSemesterAverage(
  inputs: Array<{ type: AssessmentType; score: number | null }>,
): number | null {
  let weightedSum = 0;
  let weightTotal = 0;

  for (const input of inputs) {
    if (input.score == null) {
      continue;
    }

    const weight =
      input.type === AssessmentType.MIDTERM
        ? 2
        : input.type === AssessmentType.FINAL
          ? 3
          : 1;

    weightedSum += input.score * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) {
    return null;
  }

  return roundGradeAverage(weightedSum / weightTotal);
}

export function computeSubjectSemesterAverage(
  inputs: SubjectScoreInput[],
): SubjectSemesterAverageResult {
  const averageInputs = inputs
    .filter((input) => !isAbsentScoreCell(input.score, input.note, input.type))
    .map((input) => ({
      type: input.type,
      score: input.score,
    }));

  const midtermScore =
    inputs.find(
      (input) =>
        input.type === AssessmentType.MIDTERM &&
        input.score != null &&
        !isAbsentScoreCell(input.score, input.note, input.type),
    )?.score ?? null;

  const finalScore =
    inputs.find(
      (input) =>
        input.type === AssessmentType.FINAL &&
        input.score != null &&
        !isAbsentScoreCell(input.score, input.note, input.type),
    )?.score ?? null;

  return {
    regularAverage: computeRegularAverage(inputs),
    midtermScore,
    finalScore,
    semesterAverage: computeSemesterAverage(averageInputs),
  };
}

export function computeSubjectYearAverage(
  hk1Average: number | null,
  hk2Average: number | null,
): number | null {
  if (hk1Average == null || hk2Average == null) {
    return null;
  }

  return roundGradeAverage((hk1Average + 2 * hk2Average) / 3);
}

export function computePassFailResult(
  inputs: SubjectScoreInput[],
  passThreshold = PASS_FAIL_PASS_THRESHOLD,
): PassFailResult {
  const regularScores = inputs
    .filter((input) => input.type === AssessmentType.REGULAR)
    .map((input) => input.score)
    .filter((score): score is number => score != null);

  if (regularScores.length === 0) {
    return PassFailResult.PENDING;
  }

  const passed = regularScores.every((score) => score >= passThreshold);
  return passed ? PassFailResult.PASS : PassFailResult.FAIL;
}

export function computeOverallAverage(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((total, value) => total + value, 0);
  return roundGradeAverage(sum / values.length);
}

export function resolveAcademicResultLevel(
  input: AcademicResultInput,
): AcademicResultLevel | null {
  const { numericSubjectAverages, passFailResults = [] } = input;

  if (numericSubjectAverages.length === 0 && passFailResults.length === 0) {
    return null;
  }

  const passFailFailCount = passFailResults.filter(
    (result) => result === PassFailResult.FAIL,
  ).length;
  // Tất cả môn nhận xét đều Đạt (hoặc không có môn NX)
  const allPassFailPass =
    passFailResults.length === 0 ||
    passFailResults.every((result) => result === PassFailResult.PASS);

  // Ít nhất y môn tính điểm đều ≥ x
  const countAtLeast = (threshold: number) =>
    numericSubjectAverages.filter((average) => average >= threshold).length;

  // Mọi môn tính điểm đều ≥ x
  const allNumericAtLeast = (threshold: number) =>
    numericSubjectAverages.length > 0 &&
    numericSubjectAverages.every((average) => average >= threshold);

  const minNumeric =
    numericSubjectAverages.length > 0
      ? Math.min(...numericSubjectAverages)
      : null;

  const minSubjects = MIN_NUMERIC_SUBJECTS_FOR_ACADEMIC_LEVEL;

  // Mức Tốt (TT22)
  if (
    allPassFailPass &&
    allNumericAtLeast(6.5) &&
    countAtLeast(8) >= minSubjects
  ) {
    return 'GOOD';
  }

  // Mức Khá (TT22)
  if (
    allPassFailPass &&
    allNumericAtLeast(5) &&
    countAtLeast(6.5) >= minSubjects
  ) {
    return 'FAIR';
  }

  // Mức Đạt (TT22)
  if (
    passFailFailCount <= 1 &&
    countAtLeast(5) >= minSubjects &&
    (minNumeric == null || minNumeric >= 3.5)
  ) {
    return 'SATISFACTORY';
  }

  return 'UNSATISFACTORY';
}
