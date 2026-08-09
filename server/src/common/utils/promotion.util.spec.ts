import {
  hasCompleteYearPromotionData,
  isEligibleForPromotion,
  MAX_ABSENCE_SESSIONS_PER_YEAR,
  resolvePromotionDecision,
  resolveYearAcademicResultLevel,
  resolveYearTrainingResultLevel,
} from '@/common/utils/promotion.util';

describe('promotion.util', () => {
  const completeYear = {
    hk1SemesterSummaryClosed: true,
    hk2SemesterSummaryClosed: true,
    hk1ConductClosed: true,
    hk2ConductClosed: true,
    yearOverallAverage: 7.5,
  };

  describe('resolveYearTrainingResultLevel', () => {
    it('returns worse level between HK1 and HK2', () => {
      expect(resolveYearTrainingResultLevel('GOOD', 'FAIR')).toBe('FAIR');
      expect(resolveYearTrainingResultLevel('UNSATISFACTORY', 'GOOD')).toBe(
        'UNSATISFACTORY',
      );
    });

    it('returns null when missing a semester', () => {
      expect(resolveYearTrainingResultLevel('GOOD', null)).toBeNull();
    });
  });

  describe('resolveYearAcademicResultLevel', () => {
    it('uses year average when subject averages exist', () => {
      expect(
        resolveYearAcademicResultLevel({
          hk1: 'GOOD',
          hk2: 'GOOD',
          yearOverallAverage: 8.2,
          yearSubjectAverages: [8.2, 8.0, 8.5, 8.1, 8.3, 8.4, 7.0, 7.5, 6.8, 6.6],
        }),
      ).toBe('GOOD');
    });
  });

  describe('isEligibleForPromotion', () => {
    it('requires complete year data', () => {
      expect(
        isEligibleForPromotion({
          academicResultLevel: 'FAIR',
          trainingResultLevel: 'GOOD',
          absentSessionCount: 0,
          hasCompleteYearData: false,
        }),
      ).toBe(false);
    });

    it('requires academic and training at least SATISFACTORY', () => {
      expect(
        isEligibleForPromotion({
          academicResultLevel: 'UNSATISFACTORY',
          trainingResultLevel: 'GOOD',
          absentSessionCount: 0,
          hasCompleteYearData: true,
        }),
      ).toBe(false);
    });

    it('rejects when absences exceed limit', () => {
      expect(
        isEligibleForPromotion({
          academicResultLevel: 'FAIR',
          trainingResultLevel: 'GOOD',
          absentSessionCount: MAX_ABSENCE_SESSIONS_PER_YEAR + 1,
          hasCompleteYearData: true,
        }),
      ).toBe(false);
    });

    it('accepts when all conditions met', () => {
      expect(
        isEligibleForPromotion({
          academicResultLevel: 'SATISFACTORY',
          trainingResultLevel: 'SATISFACTORY',
          absentSessionCount: 45,
          hasCompleteYearData: true,
        }),
      ).toBe(true);
    });
  });

  describe('resolvePromotionDecision', () => {
    it('returns PENDING when year data incomplete', () => {
      expect(
        resolvePromotionDecision({
          academicResultLevel: 'GOOD',
          trainingResultLevel: 'GOOD',
          yearOverallAverage: 8,
          absentSessionCount: 0,
          hasCompleteYearData: false,
          isGraduatingGrade: false,
        }),
      ).toBe('PENDING');
    });

    it('returns RETAINED when absences exceed limit', () => {
      expect(
        resolvePromotionDecision({
          academicResultLevel: 'GOOD',
          trainingResultLevel: 'GOOD',
          yearOverallAverage: 8,
          absentSessionCount: 46,
          hasCompleteYearData: true,
          isGraduatingGrade: false,
        }),
      ).toBe('RETAINED');
    });

    it('returns PROMOTED when eligible', () => {
      expect(
        resolvePromotionDecision({
          academicResultLevel: 'FAIR',
          trainingResultLevel: 'GOOD',
          yearOverallAverage: 7.2,
          absentSessionCount: 10,
          hasCompleteYearData: true,
          isGraduatingGrade: false,
        }),
      ).toBe('PROMOTED');
    });

    it('returns GRADUATED for the final grade when eligible', () => {
      expect(
        resolvePromotionDecision({
          academicResultLevel: 'SATISFACTORY',
          trainingResultLevel: 'SATISFACTORY',
          yearOverallAverage: 5.5,
          absentSessionCount: 0,
          hasCompleteYearData: true,
          isGraduatingGrade: true,
        }),
      ).toBe('GRADUATED');
    });
  });

  describe('hasCompleteYearPromotionData', () => {
    it('requires closed HK summaries, conduct and year average', () => {
      expect(hasCompleteYearPromotionData(completeYear)).toBe(true);
      expect(
        hasCompleteYearPromotionData({
          ...completeYear,
          hk2SemesterSummaryClosed: false,
        }),
      ).toBe(false);
    });
  });
});
