import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import type { EnvConfig } from '@/common/config/env.schema';
import { PrismaService } from '@/common/database/prisma.service';
import { UserRole } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { AUTH_COOKIE, JWT_ACCESS_STRATEGY } from '@/common/auth/auth.constants';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
} from '@/common/auth/auth.types';
import { RedisService } from '@/common/database/redis.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  JWT_ACCESS_STRATEGY,
) {
  constructor(
    configService: ConfigService<EnvConfig, true>,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
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

    const isSessionStillValid = await this.redisService.getSessionFromWhiteList(
      payload.sessionId,
    );

    if (!isSessionStillValid) {
      throw new AppException(
        'SESSION_EXPIRED',
        'Phiên đã hết hạn',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const activeSchoolId = payload.activeSchoolId;
    const impersonating =
      user.role === UserRole.SYSTEM_ADMIN &&
      Boolean(activeSchoolId) &&
      payload.impersonatedBy === user.id &&
      payload.impersonatedBy === payload.sub;

    if (user.role === UserRole.SYSTEM_ADMIN) {
      if (activeSchoolId && !impersonating) {
        throw new AppException(
          'TENANT_MISMATCH',
          'Thông tin trường không khớp',
          HttpStatus.FORBIDDEN,
        );
      }
    } else if (!user.schoolId || user.schoolId !== activeSchoolId) {
      throw new AppException(
        'TENANT_MISMATCH',
        'Thông tin trường không khớp',
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      schoolId: user.schoolId,
      activeSchoolId: activeSchoolId ?? '',
      impersonatedBy: payload.impersonatedBy,
      impersonationMode: payload.impersonationMode,
      sessionId: payload.sessionId,
      deviceId: payload.deviceId,
    };
  }
}
