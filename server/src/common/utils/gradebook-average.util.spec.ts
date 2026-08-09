import { AssessmentType, PassFailResult } from '@prisma/client';

import {
  computeOverallAverage,
  computePassFailResult,
  computeRegularAverage,
  computeSemesterAverage,
  computeSubjectSemesterAverage,
  computeSubjectYearAverage,
  isGradebookScoreCellComplete,
  resolveAcademicResultLevel,
} from '@/common/utils/gradebook-average.util';

describe('gradebook-average.util', () => {
  describe('isGradebookScoreCellComplete', () => {
    it('accepts numeric score', () => {
      expect(
        isGradebookScoreCellComplete(8, null, AssessmentType.REGULAR),
      ).toBe(true);
    });

    it('rejects GK/CK with note but no score', () => {
      expect(
        isGradebookScoreCellComplete(null, 'Vắng', AssessmentType.MIDTERM),
      ).toBe(false);
      expect(
        isGradebookScoreCellComplete(null, 'Vắng', AssessmentType.FINAL),
      ).toBe(false);
    });

    it('rejects empty TX cell', () => {
      expect(
        isGradebookScoreCellComplete(null, null, AssessmentType.REGULAR),
      ).toBe(false);
    });

    it('rejects empty GK without note', () => {
      expect(
        isGradebookScoreCellComplete(null, null, AssessmentType.FINAL),
      ).toBe(false);
    });
  });

  describe('computeRegularAverage', () => {
    it('averages REGULAR scores only', () => {
      expect(
        computeRegularAverage([
          { type: AssessmentType.REGULAR, score: 8 },
          { type: AssessmentType.REGULAR, score: 7 },
          { type: AssessmentType.MIDTERM, score: 9 },
        ]),
      ).toBe(7.5);
    });
  });

  describe('computeSemesterAverage', () => {
    it('weights TX=1, GK=2, CK=3', () => {
      expect(
        computeSemesterAverage([
          { type: AssessmentType.REGULAR, score: 8 },
          { type: AssessmentType.MIDTERM, score: 7.5 },
          { type: AssessmentType.FINAL, score: 8.5 },
        ]),
      ).toBe(8.08);
    });

    it('returns null when no scored inputs', () => {
      expect(
        computeSemesterAverage([{ type: AssessmentType.REGULAR, score: null }]),
      ).toBeNull();
    });
  });

  describe('computeSubjectSemesterAverage', () => {
    it('returns structured semester result', () => {
      const result = computeSubjectSemesterAverage([
        { type: AssessmentType.REGULAR, score: 8 },
        { type: AssessmentType.MIDTERM, score: 7.5 },
        { type: AssessmentType.FINAL, score: 8.5 },
      ]);

      expect(result.regularAverage).toBe(8);
      expect(result.midtermScore).toBe(7.5);
      expect(result.finalScore).toBe(8.5);
      expect(result.semesterAverage).toBe(8.08);
    });

    it('ignores absent GK/CK cells with note', () => {
      const result = computeSubjectSemesterAverage([
        { type: AssessmentType.REGULAR, score: 8 },
        { type: AssessmentType.MIDTERM, score: null, note: 'Vắng thi' },
        { type: AssessmentType.FINAL, score: 8.5 },
      ]);

      expect(result.midtermScore).toBeNull();
      expect(result.semesterAverage).toBe(8.38);
    });
  });

  describe('computeSubjectYearAverage', () => {
    it('uses (HK1 + 2*HK2) / 3', () => {
      expect(computeSubjectYearAverage(6.92, 8)).toBe(7.64);
    });

    it('returns null when a semester is missing', () => {
      expect(computeSubjectYearAverage(6.92, null)).toBeNull();
    });
  });

  describe('computePassFailResult', () => {
    it('returns PASS when all regular scores meet threshold', () => {
      expect(
        computePassFailResult([
          { type: AssessmentType.REGULAR, score: 5 },
          { type: AssessmentType.REGULAR, score: 6 },
        ]),
      ).toBe(PassFailResult.PASS);
    });

    it('returns FAIL when a regular score is below threshold', () => {
      expect(
        computePassFailResult([
          { type: AssessmentType.REGULAR, score: 4.5 },
          { type: AssessmentType.REGULAR, score: 6 },
        ]),
      ).toBe(PassFailResult.FAIL);
    });

    it('returns PENDING when no regular scores', () => {
      expect(computePassFailResult([])).toBe(PassFailResult.PENDING);
    });
  });

  describe('computeOverallAverage', () => {
    it('averages subject semester averages', () => {
      expect(computeOverallAverage([8.08, 7.33, 8.58])).toBe(8);
    });
  });

  describe('resolveAcademicResultLevel (TT22)', () => {
    const goodNumeric = [8.2, 8.0, 8.5, 8.1, 8.3, 8.4, 7.0, 7.5, 6.8, 6.6];
    const fairNumeric = [7.0, 6.8, 6.6, 6.5, 6.5, 6.5, 5.5, 5.2, 5.0, 5.0];
    const satisfactoryNumeric = [
      5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 4.0, 4.5, 4.8, 3.5,
    ];

    it('returns GOOD when TT22 Tốt criteria met', () => {
      expect(
        resolveAcademicResultLevel({
          numericSubjectAverages: goodNumeric,
          passFailResults: [PassFailResult.PASS, PassFailResult.PASS],
        }),
      ).toBe('GOOD');
    });

    it('returns FAIR when TT22 Khá criteria met', () => {
      expect(
        resolveAcademicResultLevel({
          numericSubjectAverages: fairNumeric,
          passFailResults: [PassFailResult.PASS],
        }),
      ).toBe('FAIR');
    });

    it('returns SATISFACTORY when TT22 Đạt criteria met', () => {
      expect(
        resolveAcademicResultLevel({
          numericSubjectAverages: satisfactoryNumeric,
          passFailResults: [PassFailResult.FAIL],
        }),
      ).toBe('SATISFACTORY');
    });

    it('returns UNSATISFACTORY when a numeric subject is below 3.5', () => {
      expect(
        resolveAcademicResultLevel({
          numericSubjectAverages: [
            5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 4.0, 4.5, 4.8, 3.4,
          ],
        }),
      ).toBe('UNSATISFACTORY');
    });

    it('returns null when no subject data', () => {
      expect(
        resolveAcademicResultLevel({
          numericSubjectAverages: [],
          passFailResults: [],
        }),
      ).toBeNull();
    });
  });
});
