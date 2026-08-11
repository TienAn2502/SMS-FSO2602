import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

import type { EnvConfig } from '@/common/config/env.schema';
import { AUTH_COOKIE, AUTH_REFRESH_PATH } from '@/common/auth/auth.constants';

@Injectable()
export class CookieService {
  private readonly secure: boolean;
  private readonly sameSite: CookieOptions['sameSite'];

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    this.secure = this.configService.get('COOKIE_SECURE', { infer: true });
    this.sameSite = this.configService.get('COOKIE_SAME_SITE', {
      infer: true,
    });
  }

  setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    this.setAccessCookie(response, accessToken);
    response.cookie(
      AUTH_COOKIE.REFRESH,
      refreshToken,
      this.getRefreshCookieOptions(),
    );
  }

  setAccessCookie(response: Response, accessToken: string): void {
    response.cookie(
      AUTH_COOKIE.ACCESS,
      accessToken,
      this.getAccessCookieOptions(),
    );
  }

  clearAuthCookies(response: Response): void {
    response.clearCookie(AUTH_COOKIE.ACCESS, this.getAccessCookieOptions());
    response.clearCookie(AUTH_COOKIE.REFRESH, this.getRefreshCookieOptions());
  }

  private getAccessCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: '/',
    };
  }

  private getRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: AUTH_REFRESH_PATH,
    };
  }
}
