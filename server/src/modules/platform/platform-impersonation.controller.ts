import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PlatformGuard } from '@/common/guards/platform.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '@/common/schemas/shared.schema';
import { PlatformImpersonationService } from '@/modules/platform/platform-impersonation.service';
import {
  startPlatformImpersonationSchema,
  type StartPlatformImpersonationInput,
} from '@/modules/platform/schemas/platform-impersonation.schema';

@ApiTags('Platform')
@ApiCookieAuth('access_token')
@Controller('platform')
@UseGuards(PlatformGuard)
export class PlatformImpersonationController {
  constructor(
    private readonly platformImpersonationService: PlatformImpersonationService,
  ) {}

  @Post('schools/:id/impersonate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bắt đầu đăng nhập thay trường (system admin)' })
  async start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(startPlatformImpersonationSchema.partial()))
    body: Partial<StartPlatformImpersonationInput>,
    // @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.platformImpersonationService.start(user, id, {
      mode: body.mode ?? 'read_only',
    });

    return {
      success: true,
      data,
      message: 'Bắt đầu đăng nhập thay trường',
    };
  }

  @Post('impersonation/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Kết thúc đăng nhập thay — trở về context nền tảng',
  })
  async end(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.platformImpersonationService.end(user, response);

    return {
      success: true,
      data,
      message: 'Đã kết thúc đăng nhập thay',
    };
  }
}
