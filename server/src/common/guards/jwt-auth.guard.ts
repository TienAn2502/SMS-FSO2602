import {
  ExecutionContext,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY, JWT_ACCESS_STRATEGY } from '@/common/auth/auth.constants';
import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { AppException } from '@/common/exceptions/app.exception';

function getErrorName(info: unknown): string | undefined {
  if (typeof info === 'object' && info !== null && 'name' in info) {
    return (info as { name: string }).name;
  }
  return undefined;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_ACCESS_STRATEGY) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  // Sau khi chạy jwt-access strategy, sẽ chạy vào đây kể cả có lỗi hay không
  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false,
    info: unknown,
  ): TUser {
    if (err instanceof AppException) {
      throw err;
    }

    const errorName = getErrorName(info);

    if (errorName === 'TokenExpiredError') {
      throw new AppException(
        'SESSION_EXPIRED',
        'Phiên đăng nhập đã hết hạn',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (errorName === 'JsonWebTokenError') {
      throw new AppException(
        'UNAUTHORIZED',
        'Token không hợp lệ',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (err instanceof UnauthorizedException) {
      throw new AppException(
        'UNAUTHORIZED',
        'Bạn cần đăng nhập để thực hiện thao tác này',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (err || !user) {
      throw new AppException(
        'UNAUTHORIZED',
        'Bạn cần đăng nhập để thực hiện thao tác này',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return user;
  }
}
