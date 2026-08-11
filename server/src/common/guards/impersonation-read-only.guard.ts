import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { IS_PUBLIC_KEY } from '@/common/auth/auth.constants';
import { isImpersonating } from '@/common/auth/impersonation.util';
import { AppException } from '@/common/exceptions/app.exception';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class ImpersonationReadOnlyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user || !isImpersonating(user)) {
      return true;
    }

    if (user.impersonationMode !== 'read_only') {
      return true;
    }

    if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    const path = `${request.baseUrl}${request.path}`;
    if (path.includes('/platform') || path.includes('/auth')) {
      return true;
    }

    throw new AppException(
      'IMPERSONATION_READ_ONLY',
      'Phiên xem thay chỉ được phép đọc dữ liệu',
      HttpStatus.FORBIDDEN,
    );
  }
}
