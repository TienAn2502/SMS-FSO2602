import { HttpStatus, Injectable } from '@nestjs/common';
import type { Response } from 'express';

import { CookieService } from '@/common/auth/cookie.service';
import { JwtTokenService } from '@/common/auth/jwt-token.service';
import type {
  AuthSessionData,
  RefreshTokenPayload,
} from '@/common/auth/auth.types';
import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { PasswordService } from '@/common/utils/password.service';
import type { LoginInput } from '@/modules/auth/schemas/login.schema';
import { toAuthSessionData } from '@/modules/auth/mappers/auth.mapper';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly cookieService: CookieService,
  ) {}

  async login(input: LoginInput, response: Response): Promise<AuthSessionData> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { school: true },
    });

    if (!user) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Email hoặc mật khẩu không đúng',
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

    const passwordValid = await this.passwordService.verify(
      input.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Email hoặc mật khẩu không đúng',
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.issueTokens(response, user.id, user.schoolId);
    return toAuthSessionData(user);
  }

  async refresh(
    refreshToken: string | undefined,
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

    this.issueTokens(response, user.id, user.schoolId);
    return toAuthSessionData(user);
  }

  logout(response: Response): void {
    this.cookieService.clearAuthCookies(response);
  }

  async getMe(userId: string): Promise<AuthSessionData> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    return toAuthSessionData(user);
  }

  private issueTokens(
    response: Response,
    userId: string,
    activeSchoolId: string,
  ): void {
    const accessToken = this.jwtTokenService.signAccessToken({
      sub: userId,
      activeSchoolId,
    });
    const refreshToken = this.jwtTokenService.signRefreshToken({
      sub: userId,
    });

    this.cookieService.setAuthCookies(response, accessToken, refreshToken);
  }
}
