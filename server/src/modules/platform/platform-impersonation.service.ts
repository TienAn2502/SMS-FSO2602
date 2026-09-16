import { HttpStatus, Injectable } from '@nestjs/common';
import { SchoolStatus, UserRole } from '@prisma/client';
import type { Response } from 'express';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { isImpersonating } from '@/common/auth/impersonation.util';
import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { AuthService } from '@/modules/auth/auth.service';
import { toImpersonationSessionData } from '@/modules/auth/mappers/auth.mapper';
import type {
  PlatformImpersonationEndResult,
  PlatformImpersonationStartResult,
  StartPlatformImpersonationInput,
} from '@/modules/platform/schemas/platform-impersonation.schema';

@Injectable()
export class PlatformImpersonationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async start(
    actor: AuthenticatedUser,
    schoolId: string,
    input: StartPlatformImpersonationInput,
    response: Response,
  ): Promise<PlatformImpersonationStartResult> {
    if (actor.role !== UserRole.SYSTEM_ADMIN) {
      throw new AppException(
        'IMPERSONATION_FORBIDDEN',
        'Chỉ quản trị hệ thống mới được đăng nhập thay',
        HttpStatus.FORBIDDEN,
      );
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new AppException(
        'SCHOOL_NOT_FOUND',
        'Không tìm thấy trường',
        HttpStatus.NOT_FOUND,
      );
    }

    if (school.status !== SchoolStatus.ACTIVE) {
      throw new AppException(
        'SCHOOL_NOT_ACTIVE',
        'Chỉ có thể đăng nhập thay trường đang hoạt động',
        HttpStatus.FORBIDDEN,
      );
    }

    const startedAt = new Date();
    const impersonation = toImpersonationSessionData(
      school,
      actor.id,
      input.mode,
      startedAt,
    );

    this.authService.issueTokens(
      response,
      actor.id,
      actor.sessionId,
      actor.deviceId,
      school.id,
      {
        impersonatedBy: actor.id,
        impersonationMode: input.mode,
      },
    );

    return {
      impersonation,
      redirectTo: '/',
    };
  }

  end(
    actor: AuthenticatedUser,
    response: Response,
  ): PlatformImpersonationEndResult {
    if (!isImpersonating(actor)) {
      throw new AppException(
        'IMPERSONATION_NOT_ACTIVE',
        'Không có phiên đăng nhập thay đang hoạt động',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.authService.issueTokens(
      response,
      actor.id,
      actor.sessionId,
      actor.deviceId,
    );

    return {
      ended: true,
      redirectTo: '/platform',
    };
  }
}
