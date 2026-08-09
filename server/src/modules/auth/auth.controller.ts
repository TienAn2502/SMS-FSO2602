import { Controller, Get, Post, Body, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AUTH_COOKIE } from '@/common/auth/auth.constants';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { AuthService } from '@/modules/auth/auth.service';
import { loginSchema, type LoginInput } from '@/modules/auth/schemas/login.schema';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Đăng nhập' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.authService.login(body, response);

    return {
      success: true,
      data,
      message: 'Đăng nhập thành công',
    };
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Làm mới access token' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.authService.refresh(
      request.cookies?.[AUTH_COOKIE.REFRESH] as string | undefined,
      response,
    );

    return {
      success: true,
      data,
      message: 'Làm mới phiên đăng nhập thành công',
    };
  }

  @Post('logout')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Đăng xuất' })
  logout(@Res({ passthrough: true }) response: Response) {
    this.authService.logout(response);

    return {
      success: true,
      data: null,
      message: 'Đăng xuất thành công',
    };
  }

  @Get('me')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Thông tin session hiện tại' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }
}
