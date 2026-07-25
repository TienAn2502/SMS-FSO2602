import { HttpStatus } from '@nestjs/common';

import { AppException } from '../exceptions/app.exception';
import { assertValidDateRange } from '../schemas/academic.schema';

export function validateDateRangeOrThrow(
  startDate: string,
  endDate: string,
): void {
  try {
    assertValidDateRange(startDate, endDate);
  } catch {
    throw new AppException(
      'INVALID_DATE_RANGE',
      'Ngày kết thúc phải sau ngày bắt đầu',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
