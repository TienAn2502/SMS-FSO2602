import { HttpStatus } from '@nestjs/common';
import type { ZodError } from 'zod';

import { AppException } from '@/common/exceptions/app.exception';
import type { ApiErrorDetail } from '@/common/types/api-response.types';

function mapZodError(error: ZodError): ApiErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));
}

export class ZodValidationException extends AppException {
  constructor(error: ZodError) {
    super(
      'VALIDATION_ERROR',
      'Dữ liệu không hợp lệ',
      HttpStatus.BAD_REQUEST,
      mapZodError(error),
    );
  }
}
