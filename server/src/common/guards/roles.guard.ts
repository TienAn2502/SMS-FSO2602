import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import type { Request } from 'express';

import { ROLES_KEY } from '@/common/auth/auth.constants';
import { hasEffectiveRole } from '@/common/auth/impersonation.util';
import { AppException } from '@/common/exceptions/app.exception';
import { AuthenticatedUser } from '@/common/auth/auth.types';

// Check role xem có hợp lệ không
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new AppException(
        'UNAUTHORIZED',
        'Bạn cần đăng nhập để thực hiện thao tác này',
        HttpStatus.UNAUTHORIZED,
      );
    }

    //  Check xem có phải system admin không
    if (
      !requiredRoles.some((role) =>
        hasEffectiveRole(user as AuthenticatedUser, role),
      )
    ) {
      throw new AppException(
        'FORBIDDEN',
        'Bạn không có quyền thực hiện thao tác này',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
