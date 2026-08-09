import { AppException } from '@/common/exceptions/app.exception';
import { validateSemesterWithinAcademicYearOrThrow } from '@/common/utils/semester-date-range.util';

describe('validateSemesterWithinAcademicYearOrThrow', () => {
  const yearStart = '2025-09-01';
  const yearEnd = '2026-05-31';

  it('accepts semester dates within academic year bounds', () => {
    expect(() =>
      validateSemesterWithinAcademicYearOrThrow(
        '2025-09-01',
        '2025-12-31',
        yearStart,
        yearEnd,
      ),
    ).not.toThrow();
  });

  it('accepts semester aligned to academic year boundaries', () => {
    expect(() =>
      validateSemesterWithinAcademicYearOrThrow(
        yearStart,
        yearEnd,
        yearStart,
        yearEnd,
      ),
    ).not.toThrow();
  });

  it('rejects semester start before academic year start', () => {
    expect(() =>
      validateSemesterWithinAcademicYearOrThrow(
        '2025-08-31',
        '2025-12-31',
        yearStart,
        yearEnd,
      ),
    ).toThrow(AppException);

    try {
      validateSemesterWithinAcademicYearOrThrow(
        '2025-08-31',
        '2025-12-31',
        yearStart,
        yearEnd,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe(
        'SEMESTER_START_BEFORE_ACADEMIC_YEAR',
      );
    }
  });

  it('rejects semester end after academic year end', () => {
    try {
      validateSemesterWithinAcademicYearOrThrow(
        '2026-01-01',
        '2026-06-01',
        yearStart,
        yearEnd,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('SEMESTER_END_AFTER_ACADEMIC_YEAR');
    }
  });
});
