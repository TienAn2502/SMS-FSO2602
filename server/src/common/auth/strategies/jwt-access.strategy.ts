import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import type { EnvConfig } from '@/common/config/env.schema';
import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { AUTH_COOKIE, JWT_ACCESS_STRATEGY } from '@/common/auth/auth.constants';
import type { AccessTokenPayload, AuthenticatedUser } from '@/common/auth/auth.types';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  JWT_ACCESS_STRATEGY,
) {
  constructor(
    configService: ConfigService<EnvConfig, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          (request.cookies?.[AUTH_COOKIE.ACCESS] as string | undefined) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    // * Sau sẽ thành query xuống Redis thay vì Database
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { school: true },
    });

    if (!user) {
      throw new AppException(
        'UNAUTHORIZED',
        'Tài khoản không tồn tại',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new AppException(
        'ACCOUNT_INACTIVE',
        'Tài khoản đã bị khóa hoặc không hoạt động',
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.schoolId !== payload.activeSchoolId) {
      throw new AppException(
        'TENANT_MISMATCH',
        'Thông tin trường không khớp',
        HttpStatus.FORBIDDEN,
      );
    }

    // Gán vào user bên jwt-auth.guard.ts
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      schoolId: user.schoolId,
      activeSchoolId: payload.activeSchoolId,
    };
  }
}
