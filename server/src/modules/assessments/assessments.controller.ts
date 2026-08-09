import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '@/common/schemas/shared.schema';
import { AssessmentsService } from '@/modules/assessments/assessments.service';
import {
  listAssessmentsQuerySchema,
  listGradebookOverviewQuerySchema,
  type ListAssessmentsQuery,
  type ListGradebookOverviewQuery,
} from '@/modules/assessments/schemas/assessment.schema';

@ApiTags('Assessments')
@ApiCookieAuth('access_token')
@Controller('assessments')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Danh sách đầu điểm (mặc định: học kỳ hiện hành của trường, chỉ xem)',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listAssessmentsQuerySchema))
    query: ListAssessmentsQuery,
  ) {
    const result = await this.assessmentsService.list(
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

  @Get('overview')
  @ApiOperation({
    summary:
      'Tổng quan sổ điểm theo lớp môn — giám sát tiến độ nhập điểm toàn trường',
  })
  async listOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listGradebookOverviewQuerySchema))
    query: ListGradebookOverviewQuery,
  ) {
    const result = await this.assessmentsService.listGradebookOverview(
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

  @Get('course-sections/:courseSectionId/grid')
  @ApiOperation({
    summary: 'Sổ điểm lớp môn (chỉ xem) — admin giám sát',
  })
  async getCourseSectionGrid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSectionId', new ZodValidationPipe(uuidParamSchema))
    courseSectionId: string,
  ) {
    const data = await this.assessmentsService.getGradebookGrid(
      user.activeSchoolId,
      courseSectionId,
    );

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Chi tiết đầu điểm (kèm điểm HS, chỉ xem)',
  })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const data = await this.assessmentsService.findById(
      user.activeSchoolId,
      id,
    );

    return {
      success: true,
      data,
      message: null,
    };
  }
}
