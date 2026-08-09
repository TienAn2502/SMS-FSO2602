import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { ApiSuccessResponse } from '@/common/types/api-response.types';

@Injectable()
export class ResponseWrapperInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (data instanceof StreamableFile) {
          return data;
        }

        if (this.isAlreadyWrapped(data)) {
          return data;
        }

        const wrapped: ApiSuccessResponse<unknown> = {
          success: true,
          data,
          message: null,
        };
        return wrapped;
      }),
    );
  }

  private isAlreadyWrapped(data: unknown): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      'success' in data &&
      data.success === true
    );
  }
}
