import { HttpStatus, Injectable } from '@nestjs/common';
import { SchoolStatus, UserRole } from '@prisma/client';
import type { Response } from 'express';

import { CookieService } from '@/common/auth/cookie.service';
import { JwtTokenService } from '@/common/auth/jwt-token.service';
import type {
  AccessTokenPayload,
  AuthSessionData,
  AuthenticatedUser,
  RefreshTokenPayload,
} from '@/common/auth/auth.types';
import { isImpersonating } from '@/common/auth/impersonation.util';
import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { PasswordService } from '@/common/utils/password.service';
import type { ChangePasswordInput } from '@/modules/auth/schemas/change-password.schema';
import type { LoginInput } from '@/modules/auth/schemas/login.schema';
import {
  buildAuthSessionForUser,
  toAuthSessionData,
} from '@/modules/auth/mappers/auth.mapper';
import {
  buildPhoneLookupVariants,
  looksLikeEmail,
  looksLikePersonCode,
  looksLikePhone,
} from '@/modules/auth/utils/login-identifier.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly cookieService: CookieService,
  ) {}

  async login(input: LoginInput, response: Response): Promise<AuthSessionData> {
    const user = await this.resolveUserByLoginIdentifier(input.identifier);

    if (!user) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Mã / SĐT / email hoặc mật khẩu không đúng',
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

    this.assertSchoolActiveForLogin(user.role, user.school?.status);

    const passwordValid = await this.passwordService.verify(
      input.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Mã / SĐT / email hoặc mật khẩu không đúng',
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.issueTokens(response, user.id, user.schoolId ?? undefined);
    return toAuthSessionData(user, user.school, null);
  }

  async refresh(
    refreshToken: string | undefined,
    currentAccessToken: string | undefined,
    response: Response,
  ): Promise<AuthSessionData> {
    if (!refreshToken) {
      throw new AppException(
        'SESSION_EXPIRED',
        'Phiên đăng nhập đã hết hạn',
        HttpStatus.UNAUTHORIZED,
      );
    }

    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtTokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new AppException(
        'SESSION_EXPIRED',
        'Phiên đăng nhập đã hết hạn',
        HttpStatus.UNAUTHORIZED,
      );
    }

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

    this.assertSchoolActiveForLogin(user.role, user.school?.status);

    const preservedAccessPayload =
      this.decodeAccessTokenPayload(currentAccessToken);
    const preservingImpersonation =
      preservedAccessPayload?.sub === user.id &&
      preservedAccessPayload.impersonatedBy === user.id &&
      Boolean(preservedAccessPayload.activeSchoolId);

    const activeSchoolId = preservingImpersonation
      ? preservedAccessPayload!.activeSchoolId
      : (user.schoolId ?? undefined);

    this.issueTokens(
      response,
      user.id,
      activeSchoolId,
      preservingImpersonation
        ? {
            impersonatedBy: preservedAccessPayload!.impersonatedBy,
            impersonationMode: preservedAccessPayload!.impersonationMode,
          }
        : undefined,
    );

    const sessionUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      schoolId: user.schoolId,
      activeSchoolId: activeSchoolId ?? '',
      impersonatedBy: preservingImpersonation
        ? preservedAccessPayload!.impersonatedBy
        : undefined,
      impersonationMode: preservingImpersonation
        ? preservedAccessPayload!.impersonationMode
        : undefined,
    };

    return buildAuthSessionForUser(this.prisma, user, sessionUser);
  }

  logout(response: Response): void {
    this.cookieService.clearAuthCookies(response);
  }

  async getMe(sessionUser: AuthenticatedUser): Promise<AuthSessionData> {
    const user = await this.prisma.user.findUnique({
      where: { id: sessionUser.id },
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

    return buildAuthSessionForUser(this.prisma, user, sessionUser);
  }

  async changePassword(
    sessionUser: AuthenticatedUser,
    input: ChangePasswordInput,
  ): Promise<void> {
    if (isImpersonating(sessionUser)) {
      throw new AppException(
        'IMPERSONATION_FORBIDDEN',
        'Không thể đổi mật khẩu khi đang đăng nhập thay',
        HttpStatus.FORBIDDEN,
      );
    }

    const allowedRoles: UserRole[] = [
      UserRole.SCHOOL_ADMIN,
      UserRole.TEACHER,
      UserRole.STUDENT,
    ];

    if (!allowedRoles.includes(sessionUser.role)) {
      throw new AppException(
        'FORBIDDEN',
        'Bạn không có quyền thực hiện thao tác này',
        HttpStatus.FORBIDDEN,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: sessionUser.id },
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

    const currentValid = await this.passwordService.verify(
      input.currentPassword,
      user.passwordHash,
    );

    if (!currentValid) {
      throw new AppException(
        'INVALID_CURRENT_PASSWORD',
        'Mật khẩu hiện tại không đúng',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordHash = await this.passwordService.hash(input.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  }

  issueAccessToken(
    response: Response,
    payload: AccessTokenPayload,
  ): void {
    const accessToken = this.jwtTokenService.signAccessToken(payload);
    this.cookieService.setAccessCookie(response, accessToken);
  }

  private issueTokens(
    response: Response,
    userId: string,
    activeSchoolId?: string,
    impersonation?: Pick<
      AccessTokenPayload,
      'impersonatedBy' | 'impersonationMode'
    >,
  ): void {
    const accessToken = this.jwtTokenService.signAccessToken({
      sub: userId,
      ...(activeSchoolId ? { activeSchoolId } : {}),
      ...(impersonation?.impersonatedBy
        ? {
            impersonatedBy: impersonation.impersonatedBy,
            impersonationMode: impersonation.impersonationMode ?? 'read_only',
          }
        : {}),
    });
    const refreshToken = this.jwtTokenService.signRefreshToken({
      sub: userId,
    });

    this.cookieService.setAuthCookies(response, accessToken, refreshToken);
  }

  private decodeAccessTokenPayload(
    token: string | undefined,
  ): AccessTokenPayload | null {
    if (!token) {
      return null;
    }

    try {
      return this.jwtTokenService.verifyAccessToken(token);
    } catch {
      return this.jwtTokenService.decodeAccessToken(token);
    }
  }

  /**
   * Resolve user từ email / mã HS|GV|PH / SĐT hồ sơ.
   * Mã & SĐT chỉ khớp hồ sơ đã gắn tài khoản (userId).
   */
  private async resolveUserByLoginIdentifier(identifier: string) {
    const value = identifier.trim();
    if (!value) {
      return null;
    }

    if (looksLikeEmail(value)) {
      return this.prisma.user.findUnique({
        where: { email: value.toLowerCase() },
        include: { school: true },
      });
    }

    const userIds = new Set<string>();

    const tryCode = looksLikePersonCode(value) || !looksLikePhone(value);
    const tryPhone = looksLikePhone(value) || !looksLikePersonCode(value);

    if (tryCode) {
      for (const id of await this.findUserIdsByPersonCode(value)) {
        userIds.add(id);
      }
    }

    if (tryPhone) {
      for (const id of await this.findUserIdsByPhone(value)) {
        userIds.add(id);
      }
    }

    if (userIds.size === 0) {
      return null;
    }

    if (userIds.size > 1) {
      throw new AppException(
        'LOGIN_AMBIGUOUS',
        'Có nhiều tài khoản khớp thông tin đăng nhập. Dùng mã HS/GV/PH hoặc liên hệ nhà trường.',
        HttpStatus.CONFLICT,
      );
    }

    const userId = [...userIds][0]!;
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { school: true },
    });
  }

  private async findUserIdsByPersonCode(rawCode: string): Promise<string[]> {
    const code = rawCode.trim();
    const [students, teachers, parents] = await Promise.all([
      this.prisma.student.findMany({
        where: {
          userId: { not: null },
          externalCode: { equals: code, mode: 'insensitive' },
        },
        select: { userId: true },
      }),
      this.prisma.teacher.findMany({
        where: {
          userId: { not: null },
          externalCode: { equals: code, mode: 'insensitive' },
        },
        select: { userId: true },
      }),
      this.prisma.parent.findMany({
        where: {
          userId: { not: null },
          externalCode: { equals: code, mode: 'insensitive' },
        },
        select: { userId: true },
      }),
    ]);

    return [
      ...students.map((row) => row.userId),
      ...teachers.map((row) => row.userId),
      ...parents.map((row) => row.userId),
    ].filter((id): id is string => Boolean(id));
  }

  private async findUserIdsByPhone(rawPhone: string): Promise<string[]> {
    const variants = buildPhoneLookupVariants(rawPhone);
    if (variants.length === 0) {
      return [];
    }

    const [students, teachers, parents] = await Promise.all([
      this.prisma.student.findMany({
        where: {
          userId: { not: null },
          phone: { in: variants },
        },
        select: { userId: true },
      }),
      this.prisma.teacher.findMany({
        where: {
          userId: { not: null },
          phone: { in: variants },
        },
        select: { userId: true },
      }),
      this.prisma.parent.findMany({
        where: {
          userId: { not: null },
          phone: { in: variants },
        },
        select: { userId: true },
      }),
    ]);

    return [
      ...students.map((row) => row.userId),
      ...teachers.map((row) => row.userId),
      ...parents.map((row) => row.userId),
    ].filter((id): id is string => Boolean(id));
  }

  private assertSchoolActiveForLogin(
    role: UserRole,
    schoolStatus: string | undefined,
  ): void {
    if (role === UserRole.SYSTEM_ADMIN) {
      return;
    }

    if (!schoolStatus || schoolStatus !== SchoolStatus.ACTIVE) {
      throw new AppException(
        'SCHOOL_SUSPENDED',
        'Trường đang bị tạm khóa. Vui lòng liên hệ quản trị nền tảng.',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
