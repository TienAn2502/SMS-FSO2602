import { HttpStatus } from '@nestjs/common';

import { AppException } from '@/common/exceptions/app.exception';

export function validateSemesterWithinAcademicYearOrThrow(
  semesterStartDate: string,
  semesterEndDate: string,
  academicYearStartDate: string,
  academicYearEndDate: string,
): void {
  if (semesterStartDate < academicYearStartDate) {
    throw new AppException(
      'SEMESTER_START_BEFORE_ACADEMIC_YEAR',
      'Ngày bắt đầu học kỳ không được trước ngày bắt đầu năm học',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (semesterEndDate > academicYearEndDate) {
    throw new AppException(
      'SEMESTER_END_AFTER_ACADEMIC_YEAR',
      'Ngày kết thúc học kỳ không được sau ngày kết thúc năm học',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
