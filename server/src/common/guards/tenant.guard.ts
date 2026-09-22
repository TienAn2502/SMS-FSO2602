import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import { AppException } from '@/common/exceptions/app.exception';
import { UserRole } from '@prisma/client';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (user?.role === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    if (!user?.activeSchoolId) {
      throw new AppException(
        'TENANT_MISMATCH',
        'Không xác định được trường đang hoạt động',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
