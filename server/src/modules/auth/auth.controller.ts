import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request, Response } from 'express';

import { AUTH_COOKIE } from '@/common/auth/auth.constants';
import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { AuthService } from '@/modules/auth/auth.service';
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from '@/modules/auth/schemas/change-password.schema';
import {
  loginSchema,
  type LoginInput,
} from '@/modules/auth/schemas/login.schema';
import { Cookies } from '@/common/decorators/cookie.decorator';

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
      request.cookies?.[AUTH_COOKIE.ACCESS] as string | undefined,
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
  async logout(
    @Res({ passthrough: true }) response: Response,
    @Cookies('refresh_token') refreshToken: string,
  ) {
    await this.authService.logout(response, refreshToken);

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
    return this.authService.getMe(user);
  }

  @Post('change-password')
  @ApiCookieAuth('access_token')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Đổi mật khẩu tài khoản đang đăng nhập' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(changePasswordSchema))
    body: ChangePasswordInput,
  ) {
    await this.authService.changePassword(user, body);

    return {
      success: true,
      data: null,
      message: 'Đổi mật khẩu thành công',
    };
  }
}
