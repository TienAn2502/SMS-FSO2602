import { HttpException, HttpStatus } from '@nestjs/common';

import type { ApiErrorDetail } from '@/common/types/api-response.types';

export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details: ApiErrorDetail[] = [],
    public readonly data?: unknown,
  ) {
    super(
      {
        success: false,
        code,
        message,
        details,
        ...(data !== undefined ? { data } : {}),
      },
      status,
    );
  }
}
