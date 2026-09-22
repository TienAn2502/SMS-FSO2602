import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';

import { uuidParamSchema } from '@/common/schemas/shared.schema';
import { GradeLevelSubjectsService } from '@/modules/grade-level-subjects/grade-level-subjects.service';
import {
  batchUpdateGradeLevelSubjectsSchema,
  listGradeLevelSubjectsQuerySchema,
  type BatchUpdateGradeLevelSubjectsInput,
  type ListGradeLevelSubjectsQuery,
} from '@/modules/grade-level-subjects/schemas/grade-level-subject.schema';

@ApiTags('Grade Level Subjects')
@ApiCookieAuth('access_token')
@Controller('grade-level-subjects')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.SYSTEM_ADMIN)
export class GradeLevelSubjectsController {
  constructor(
    private readonly gradeLevelSubjectsService: GradeLevelSubjectsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách môn theo khối (số tiết/năm)' })
  async list(
    @CurrentUser()
    user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listGradeLevelSubjectsQuerySchema))
    query: ListGradeLevelSubjectsQuery,
  ) {
    const schoolId = user.activeSchoolId;
    console.log('schoolId', schoolId);
    const result = await this.gradeLevelSubjectsService.list(schoolId, query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }

  @Get('system-admin')
  @ApiOperation({
    summary: 'Danh sách môn theo khối (số tiết/năm) cho hệ thống',
  })
  @Roles(UserRole.SYSTEM_ADMIN)
  async listForSystemAdmin(
    @CurrentUser()
    user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listGradeLevelSubjectsQuerySchema))
    query: ListGradeLevelSubjectsQuery,
  ) {
    const result =
      await this.gradeLevelSubjectsService.listForSystemAdmin(query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết cấu hình môn theo khối' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const isSystemAdmin = user.role === UserRole.SYSTEM_ADMIN;
    const data = await this.gradeLevelSubjectsService.findById(
      user.activeSchoolId,
      id,
      isSystemAdmin,
    );

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Patch('batch')
  @ApiOperation({ summary: 'Cập nhật nhiều cấu hình môn theo khối cùng lúc' })
  async updateMany(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(batchUpdateGradeLevelSubjectsSchema))
    body: BatchUpdateGradeLevelSubjectsInput,
  ) {
    const isSystemAdmin = user.role === UserRole.SYSTEM_ADMIN;
    const data = await this.gradeLevelSubjectsService.updateMany(
      user.activeSchoolId,
      body.updates,
      isSystemAdmin,
    );

    return {
      success: true,
      data,
      message: `Đã cập nhật ${data.length} cấu hình môn theo khối`,
    };
  }
}
