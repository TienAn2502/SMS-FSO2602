import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { TenantGuard } from '@/common/guards/tenant.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { SchoolsService } from '@/modules/schools/schools.service';
import {
  updateSchoolSchema,
  type UpdateSchoolInput,
} from '@/modules/schools/schemas/update-school.schema';

@ApiTags('Schools')
@ApiCookieAuth('access_token')
@Controller('schools')
@UseGuards(TenantGuard)
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Thông tin trường đang active' })
  getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.schoolsService.getCurrent(user.activeSchoolId);
  }

  @Patch('current')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SCHOOL_ADMIN) // Chỉ có role SCHOOL_ADMIN mới được phép cập nhật thông tin trường
  @ApiOperation({ summary: 'Cập nhật thông tin trường đang active' })
  async updateCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateSchoolSchema)) body: UpdateSchoolInput,
  ) {
    const data = await this.schoolsService.updateCurrent(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật thông tin trường thành công',
    };
  }
}
