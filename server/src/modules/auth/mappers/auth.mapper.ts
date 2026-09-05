import { HttpStatus } from '@nestjs/common';
import type { School, User } from '@prisma/client';

import type {
  AuthSessionData,
  AuthenticatedUser,
  ImpersonationSessionData,
  UserSocketInfo,
} from '@/common/auth/auth.types';
import { isImpersonating } from '@/common/auth/impersonation.util';
import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';

type UserWithSchool = User & { school: School | null };

export function toAuthSessionData(
  user: UserWithSchool,
  activeSchool: School | null,
  impersonation: ImpersonationSessionData | null = null,
  socketInfo: UserSocketInfo | null = null,
  sessionId: string,
  deviceId: string,
): AuthSessionData {
  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      sessionId: sessionId,
      deviceId: deviceId,
    },
    activeSchoolId: activeSchool?.id ?? null,
    activeSchool: activeSchool
      ? {
          id: activeSchool.id,
          code: activeSchool.code,
          name: activeSchool.name,
          shortName: activeSchool.shortName,
        }
      : null,
    impersonation,
    socketInfo,
  };
}

export function toImpersonationSessionData(
  activeSchool: School,
  actorUserId: string,
  mode: ImpersonationSessionData['mode'],
  startedAt = new Date(),
): ImpersonationSessionData {
  return {
    targetSchoolId: activeSchool.id,
    targetSchoolName: activeSchool.name,
    impersonatedBy: actorUserId,
    mode,
    startedAt: startedAt.toISOString(),
  };
}

export async function buildAuthSessionForUser(
  prisma: PrismaService,
  user: UserWithSchool,
  sessionUser: AuthenticatedUser,
  socketInfo: UserSocketInfo | null = null,
): Promise<AuthSessionData> {
  if (!sessionUser.activeSchoolId) {
    return toAuthSessionData(
      user,
      null,
      null,
      null,
      sessionUser.sessionId,
      sessionUser.deviceId,
    );
  }

  const activeSchool = await prisma.school.findUnique({
    where: { id: sessionUser.activeSchoolId },
  });

  if (!activeSchool) {
    throw new AppException(
      'SCHOOL_NOT_FOUND',
      'Không tìm thấy trường đang hoạt động',
      HttpStatus.NOT_FOUND,
    );
  }

  const impersonation = isImpersonating(sessionUser)
    ? toImpersonationSessionData(
        activeSchool,
        sessionUser.id,
        sessionUser.impersonationMode ?? 'read_only',
      )
    : null;

  return toAuthSessionData(
    user,
    activeSchool,
    impersonation,
    socketInfo,
    sessionUser.sessionId,
    sessionUser.deviceId,
  );
}
