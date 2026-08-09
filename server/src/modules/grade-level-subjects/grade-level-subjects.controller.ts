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
  listGradeLevelSubjectsQuerySchema,
  updateGradeLevelSubjectSchema,
  type ListGradeLevelSubjectsQuery,
  type UpdateGradeLevelSubjectInput,
} from '@/modules/grade-level-subjects/schemas/grade-level-subject.schema';

@ApiTags('Grade Level Subjects')
@ApiCookieAuth('access_token')
@Controller('grade-level-subjects')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class GradeLevelSubjectsController {
  constructor(
    private readonly gradeLevelSubjectsService: GradeLevelSubjectsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách môn theo khối (số tiết/năm)' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listGradeLevelSubjectsQuerySchema))
    query: ListGradeLevelSubjectsQuery,
  ) {
    const result = await this.gradeLevelSubjectsService.list(
      user.activeSchoolId,
      query,
    );

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
    const data = await this.gradeLevelSubjectsService.findById(
      user.activeSchoolId,
      id,
    );

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật số tiết/năm môn theo khối' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateGradeLevelSubjectSchema))
    body: UpdateGradeLevelSubjectInput,
  ) {
    const data = await this.gradeLevelSubjectsService.update(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật cấu hình môn theo khối thành công',
    };
  }
}
