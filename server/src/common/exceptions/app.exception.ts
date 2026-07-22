import { HttpException, HttpStatus } from '@nestjs/common';

import type { ApiErrorDetail } from '../types/api-response.types';

export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details: ApiErrorDetail[] = [],
  ) {
    super(
      {
        success: false,
        code,
        message,
        details,
      },
      status,
    );
  }
}
