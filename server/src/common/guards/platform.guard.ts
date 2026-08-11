import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

import { AppException } from '@/common/exceptions/app.exception';

@Injectable()
export class PlatformGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new AppException(
        'UNAUTHORIZED',
        'Bạn cần đăng nhập để thực hiện thao tác này',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.role !== UserRole.SYSTEM_ADMIN) {
      throw new AppException(
        'PLATFORM_FORBIDDEN',
        'Chỉ quản trị hệ thống mới được truy cập module nền tảng',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
