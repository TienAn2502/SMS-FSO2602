import { isGraduatingGradeLevel } from '@/common/utils/grade-level.util';

describe('grade-level.util', () => {
  describe('isGraduatingGradeLevel', () => {
    it('returns true for the highest numeric grade in the school', () => {
      expect(isGraduatingGradeLevel('12', ['10', '11', '12'])).toBe(true);
      expect(isGraduatingGradeLevel('9', ['6', '7', '8', '9'])).toBe(true);
      expect(isGraduatingGradeLevel('5', ['1', '2', '3', '4', '5'])).toBe(true);
    });

    it('returns false for non-final grades', () => {
      expect(isGraduatingGradeLevel('10', ['10', '11', '12'])).toBe(false);
      expect(isGraduatingGradeLevel('8', ['6', '7', '8', '9'])).toBe(false);
    });

    it('returns false for non-numeric grade codes', () => {
      expect(isGraduatingGradeLevel('K5', ['K3', 'K4', 'K5'])).toBe(false);
    });
  });
});
