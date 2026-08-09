import type {
  AcademicResultLevel,
  PassFailResult,
  PromotionDecision,
  TrainingResultLevel,
} from '@prisma/client';

import { resolveAcademicResultLevel } from '@/common/utils/gradebook-average.util';

/** Số buổi nghỉ tối đa/năm để đủ điều kiện lên lớp (MVP — quy chế THPT). */
export const MAX_ABSENCE_SESSIONS_PER_YEAR = 45;

const LEVEL_RANK: Record<AcademicResultLevel | TrainingResultLevel, number> = {
  GOOD: 4,
  FAIR: 3,
  SATISFACTORY: 2,
  UNSATISFACTORY: 1,
};

// kiểm tra điều kiện để xét lên lớp
export function isResultLevelAtLeast(
  level: AcademicResultLevel | TrainingResultLevel | null | undefined,
  minimum: AcademicResultLevel | TrainingResultLevel,
): boolean {
  if (!level) {
    return false;
  }

  return LEVEL_RANK[level] >= LEVEL_RANK[minimum];
}

/** Rèn luyện cả năm = mức thấp hơn giữa HK1 và HK2. */
export function resolveYearTrainingResultLevel(
  hk1: TrainingResultLevel | null | undefined,
  hk2: TrainingResultLevel | null | undefined,
): TrainingResultLevel | null {
  if (hk1 == null || hk2 == null) {
    return null;
  }

  return LEVEL_RANK[hk1] <= LEVEL_RANK[hk2] ? hk1 : hk2;
}

/** Học lực cả năm — ưu tiên TB/năm + TB các môn; fallback mức thấp hơn HK1/HK2. */
export function resolveYearAcademicResultLevel(input: {
  hk1: AcademicResultLevel | null | undefined;
  hk2: AcademicResultLevel | null | undefined;
  yearOverallAverage: number | null;
  yearSubjectAverages: number[];
  passFailResults?: PassFailResult[];
}): AcademicResultLevel | null {
  const {
    hk1,
    hk2,
    yearOverallAverage,
    yearSubjectAverages,
    passFailResults = [],
  } = input;

  if (yearSubjectAverages.length > 0) {
    return resolveAcademicResultLevel({
      numericSubjectAverages: yearSubjectAverages,
      passFailResults,
    });
  }

  if (hk1 == null || hk2 == null) {
    return null;
  }

  return LEVEL_RANK[hk1] <= LEVEL_RANK[hk2] ? hk1 : hk2;
}

export function hasCompleteYearPromotionData(input: {
  hk1SemesterSummaryClosed: boolean;
  hk2SemesterSummaryClosed: boolean;
  hk1ConductClosed: boolean;
  hk2ConductClosed: boolean;
  yearOverallAverage: number | null;
}): boolean {
  return (
    input.hk1SemesterSummaryClosed &&
    input.hk2SemesterSummaryClosed &&
    input.hk1ConductClosed &&
    input.hk2ConductClosed &&
    input.yearOverallAverage != null
  );
}

// kiểm tra điều kiện để xét lên lớp
export function isEligibleForPromotion(input: {
  academicResultLevel: AcademicResultLevel | null;
  trainingResultLevel: TrainingResultLevel | null;
  absentSessionCount: number;
  hasCompleteYearData: boolean;
}): boolean {
  if (!input.hasCompleteYearData) {
    return false;
  }

  if (!isResultLevelAtLeast(input.academicResultLevel, 'SATISFACTORY')) {
    return false;
  }

  if (!isResultLevelAtLeast(input.trainingResultLevel, 'SATISFACTORY')) {
    return false;
  }

  if (input.absentSessionCount > MAX_ABSENCE_SESSIONS_PER_YEAR) {
    return false;
  }

  return true;
}

// quyết định xét lên lớp
export function resolvePromotionDecision(input: {
  academicResultLevel: AcademicResultLevel | null;
  trainingResultLevel: TrainingResultLevel | null;
  yearOverallAverage: number | null;
  absentSessionCount: number;
  hasCompleteYearData: boolean;
  isGraduatingGrade: boolean;
}): PromotionDecision {
  if (!input.hasCompleteYearData) {
    return 'PENDING';
  }

  const eligible = isEligibleForPromotion({
    academicResultLevel: input.academicResultLevel,
    trainingResultLevel: input.trainingResultLevel,
    absentSessionCount: input.absentSessionCount,
    hasCompleteYearData: input.hasCompleteYearData,
  });

  if (
    input.academicResultLevel === 'UNSATISFACTORY' ||
    input.trainingResultLevel === 'UNSATISFACTORY' ||
    input.absentSessionCount > MAX_ABSENCE_SESSIONS_PER_YEAR
  ) {
    return 'RETAINED';
  }

  if (
    input.isGraduatingGrade &&
    input.yearOverallAverage != null &&
    input.yearOverallAverage >= 5 &&
    eligible
  ) {
    return 'GRADUATED';
  }

  if (eligible) {
    return 'PROMOTED';
  }

  return 'PENDING';
}

// tính điểm trung bình cả năm
export function computeYearOverallAverage(
  hk1Average: number | null,
  hk2Average: number | null,
): number | null {
  if (hk1Average == null || hk2Average == null) {
    return null;
  }

  return Math.round(((hk1Average + hk2Average) / 2) * 100) / 100;
}
