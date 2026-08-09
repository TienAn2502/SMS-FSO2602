import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import {
  prepareSemesterFromSourceSchema,
  semesterPreparationStatusQuerySchema,
  type PrepareSemesterFromSourceInput,
  type SemesterPreparationStatusQuery,
} from '@/modules/semester-preparation/schemas/semester-preparation.schema';
import { SemesterPreparationService } from '@/modules/semester-preparation/semester-preparation.service';

@ApiTags('Semester preparation')
@ApiCookieAuth('access_token')
@Controller('academic-years/:yearId/semesters/:targetSemesterId/preparation')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class SemesterPreparationController {
  constructor(
    private readonly semesterPreparationService: SemesterPreparationService,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'Tiến độ chuẩn bị học kỳ đích từ học kỳ nguồn',
  })
  async getStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('yearId', new ZodValidationPipe(uuidParamSchema)) yearId: string,
    @Param('targetSemesterId', new ZodValidationPipe(uuidParamSchema))
    targetSemesterId: string,
    @Query(new ZodValidationPipe(semesterPreparationStatusQuerySchema))
    query: SemesterPreparationStatusQuery,
  ) {
    const data = await this.semesterPreparationService.getStatus(
      user.activeSchoolId,
      yearId,
      targetSemesterId,
      query.sourceSemesterId,
    );

    return {
      success: true,
      data,
      message: 'Lấy tiến độ chuẩn bị học kỳ thành công',
    };
  }

  @Post('prepare-from-source')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Chuẩn bị học kỳ đích: sao chép lớp môn, ghi danh và phân công từ HK nguồn',
  })
  async prepareFromSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('yearId', new ZodValidationPipe(uuidParamSchema)) yearId: string,
    @Param('targetSemesterId', new ZodValidationPipe(uuidParamSchema))
    targetSemesterId: string,
    @Body(new ZodValidationPipe(prepareSemesterFromSourceSchema))
    body: PrepareSemesterFromSourceInput,
  ) {
    const data = await this.semesterPreparationService.prepareFromSource(
      user.activeSchoolId,
      yearId,
      targetSemesterId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Chuẩn bị học kỳ thành công',
    };
  }
}
