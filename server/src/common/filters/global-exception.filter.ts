import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AppException } from '../exceptions/app.exception';
import type { ApiErrorResponse } from '../types/api-response.types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception);
    const status = this.resolveStatus(exception);

    // Ghi log lỗi nếu status lớn hơn 500
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(errorResponse);
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private buildErrorResponse(exception: unknown): ApiErrorResponse {
    if (exception instanceof AppException) {
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'code' in body) {
        return body as ApiErrorResponse;
      }
    }

    // Trường hợp lỗi không đến từ AppException nhưng là HttpException
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'code' in body) {
        return body as ApiErrorResponse;
      }

      const message =
        typeof body === 'string'
          ? body
          : typeof body === 'object' &&
              body !== null &&
              'message' in body &&
              typeof body.message === 'string'
            ? (body as { message: string }).message
            : 'Yêu cầu không hợp lệ';

      return {
        success: false,
        code: this.mapHttpStatusToCode(exception.getStatus()),
        message,
        details: [],
      };
    }

    return {
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Đã xảy ra lỗi hệ thống',
      details: [],
    };
  }

  private mapHttpStatusToCode(status: number): string {
    if (status === 400) return 'BAD_REQUEST';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    return 'INTERNAL_SERVER_ERROR';
  }
}
