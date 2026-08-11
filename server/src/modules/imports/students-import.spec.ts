import { parseStudentImportGender } from '@/modules/imports/utils/parse-student-import-gender.util';
import { validateStudentImportHeaders } from '@/modules/imports/utils/validate-student-import-headers.util';

describe('student import utils', () => {
  describe('parseStudentImportGender', () => {
    it('parses Vietnamese aliases', () => {
      expect(parseStudentImportGender('Nam')).toBe('MALE');
      expect(parseStudentImportGender('Nữ')).toBe('FEMALE');
    });

    it('returns undefined for empty input', () => {
      expect(parseStudentImportGender('')).toBeUndefined();
      expect(parseStudentImportGender(undefined)).toBeUndefined();
    });
  });

  describe('validateStudentImportHeaders', () => {
    it('reports missing required columns', () => {
      const errors = validateStudentImportHeaders(['ho_ten']);

      expect(errors).toEqual([
        {
          row: 1,
          field: 'ngay_sinh',
          message: 'Thiếu cột bắt buộc "ngay_sinh"',
        },
      ]);
    });

    it('allows missing ma_lop_hc column', () => {
      const errors = validateStudentImportHeaders(['ho_ten', 'ngay_sinh']);
      expect(errors).toEqual([]);
    });
  });
});
