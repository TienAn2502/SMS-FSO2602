import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { GradeSummariesService } from '@/modules/grade-summaries/grade-summaries.service';
import {
  finalizePromotionSchema,
  finalizeSemesterSummariesSchema,
  listSemesterSummariesQuerySchema,
  listSubjectResultsQuerySchema,
  listYearSummariesQuerySchema,
  recomputeYearSummariesSchema,
  updateYearSummaryNextHomeroomSchema,
  type FinalizePromotionInput,
  type FinalizeSemesterSummariesInput,
  type ListSemesterSummariesQuery,
  type ListSubjectResultsQuery,
  type ListYearSummariesQuery,
  type RecomputeYearSummariesInput,
  type UpdateYearSummaryNextHomeroomInput,
} from '@/modules/grade-summaries/schemas/grade-summaries-list.schema';
import {
  recomputeGradeSummariesSchema,
  type RecomputeGradeSummariesInput,
} from '@/modules/grade-summaries/schemas/grade-summaries.schema';

@ApiTags('Grade summaries')
@ApiCookieAuth('access_token')
@Controller('grade-summaries')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class GradeSummariesController {
  constructor(private readonly gradeSummariesService: GradeSummariesService) {}

  @Get('subject-results')
  @ApiOperation({ summary: 'Danh sách TB môn học kỳ' })
  async listSubjectResults(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listSubjectResultsQuerySchema))
    query: ListSubjectResultsQuery,
  ) {
    const result = await this.gradeSummariesService.listSubjectResults(
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

  @Get('semester-summaries')
  @ApiOperation({ summary: 'Danh sách tổng kết học kỳ' })
  async listSemesterSummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listSemesterSummariesQuerySchema))
    query: ListSemesterSummariesQuery,
  ) {
    const result = await this.gradeSummariesService.listSemesterSummaries(
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

  @Get('year-summaries')
  @ApiOperation({ summary: 'Danh sách tổng kết năm / lên lớp' })
  async listYearSummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listYearSummariesQuerySchema))
    query: ListYearSummariesQuery,
  ) {
    const result = await this.gradeSummariesService.listYearSummaries(
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

  @Patch('year-summaries/:id')
  @ApiOperation({ summary: 'Gán lớp hành chính năm sau cho tổng kết năm' })
  async updateYearSummaryNextHomeroom(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateYearSummaryNextHomeroomSchema))
    body: UpdateYearSummaryNextHomeroomInput,
  ) {
    const data = await this.gradeSummariesService.updateYearSummaryNextHomeroom(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật lớp năm sau thành công',
    };
  }

  @Post('recompute')
  @ApiOperation({
    summary:
      'Admin: tái tính toàn bộ (TB môn + tổng kết HK) — dùng khi sửa dữ liệu / import / khôi phục',
  })
  async recompute(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(recomputeGradeSummariesSchema))
    body: RecomputeGradeSummariesInput,
  ) {
    const data = await this.gradeSummariesService.recompute(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tái tính tổng kết thành công',
    };
  }

  @Post('recompute/subject-results')
  @ApiOperation({ summary: 'Admin: tái tính TB môn học kỳ' })
  async recomputeSubjectResults(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(recomputeGradeSummariesSchema))
    body: RecomputeGradeSummariesInput,
  ) {
    const data = await this.gradeSummariesService.recomputeSubjectResults(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tái tính kết quả môn thành công',
    };
  }

  @Post('recompute/semester-summaries')
  @ApiOperation({ summary: 'Admin: tái tính tổng kết học kỳ' })
  async recomputeSemesterSummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(recomputeGradeSummariesSchema))
    body: RecomputeGradeSummariesInput,
  ) {
    const data = await this.gradeSummariesService.recomputeSemesterSummaries(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tái tính tổng kết học kỳ thành công',
    };
  }

  @Post('semesters/:semesterId/finalize')
  @ApiOperation({ summary: 'Khóa tổng kết học kỳ theo lớp chủ nhiệm' })
  async finalizeSemester(
    @CurrentUser() user: AuthenticatedUser,
    @Param('semesterId', new ZodValidationPipe(uuidParamSchema))
    semesterId: string,
    @Body(new ZodValidationPipe(finalizeSemesterSummariesSchema))
    body: FinalizeSemesterSummariesInput,
  ) {
    const data = await this.gradeSummariesService.finalizeSemester(
      user.activeSchoolId,
      semesterId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Khóa tổng kết học kỳ thành công',
    };
  }

  @Get('semesters/:semesterId/finalize-readiness')
  @ApiOperation({ summary: 'Kiểm tra điều kiện khóa học kỳ toàn trường' })
  async getSemesterFinalizeReadiness(
    @CurrentUser() user: AuthenticatedUser,
    @Param('semesterId', new ZodValidationPipe(uuidParamSchema))
    semesterId: string,
  ) {
    const data = await this.gradeSummariesService.getSemesterFinalizeReadiness(
      user.activeSchoolId,
      semesterId,
    );

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Post('semesters/:semesterId/finalize-all')
  @ApiOperation({ summary: 'Khóa tổng kết học kỳ toàn trường' })
  async finalizeSemesterAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('semesterId', new ZodValidationPipe(uuidParamSchema))
    semesterId: string,
  ) {
    const data = await this.gradeSummariesService.finalizeSemesterAll(
      user.activeSchoolId,
      semesterId,
    );

    return {
      success: true,
      data,
      message: 'Khóa học kỳ thành công',
    };
  }

  @Post('academic-years/:academicYearId/finalize-promotion')
  @ApiOperation({ summary: 'Chốt xét lên lớp theo lớp chủ nhiệm' })
  async finalizePromotion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('academicYearId', new ZodValidationPipe(uuidParamSchema))
    academicYearId: string,
    @Body(new ZodValidationPipe(finalizePromotionSchema))
    body: FinalizePromotionInput,
  ) {
    const data = await this.gradeSummariesService.finalizePromotion(
      user.activeSchoolId,
      academicYearId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Chốt xét lên lớp thành công',
    };
  }

  @Get('academic-years/:academicYearId/finalize-promotion-readiness')
  @ApiOperation({ summary: 'Kiểm tra điều kiện chốt lên lớp toàn trường' })
  async getYearPromotionFinalizeReadiness(
    @CurrentUser() user: AuthenticatedUser,
    @Param('academicYearId', new ZodValidationPipe(uuidParamSchema))
    academicYearId: string,
  ) {
    const data =
      await this.gradeSummariesService.getYearPromotionFinalizeReadiness(
        user.activeSchoolId,
        academicYearId,
      );

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Post('academic-years/:academicYearId/finalize-promotion-all')
  @ApiOperation({ summary: 'Chốt xét lên lớp toàn trường' })
  async finalizePromotionAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('academicYearId', new ZodValidationPipe(uuidParamSchema))
    academicYearId: string,
  ) {
    const data = await this.gradeSummariesService.finalizePromotionAll(
      user.activeSchoolId,
      academicYearId,
    );

    return {
      success: true,
      data,
      message: 'Chốt lên lớp toàn trường thành công',
    };
  }

  @Post('academic-years/:academicYearId/recompute-year-summaries')
  @ApiOperation({
    summary: 'Tái tính tổng kết năm (DRAFT) — toàn trường nếu không truyền lớp',
  })
  async recomputeYearSummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('academicYearId', new ZodValidationPipe(uuidParamSchema))
    academicYearId: string,
    @Body(new ZodValidationPipe(recomputeYearSummariesSchema))
    body: RecomputeYearSummariesInput,
  ) {
    const data = await this.gradeSummariesService.recomputeYearSummaries(
      user.activeSchoolId,
      academicYearId,
      body.homeroomClassId,
    );

    return {
      success: true,
      data,
      message: 'Tái tính tổng kết năm thành công',
    };
  }
}
