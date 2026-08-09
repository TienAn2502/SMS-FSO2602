import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import {
  createStudentEnrollmentSchema,
  copySemesterEnrollmentsSchema,
  closeSemesterEnrollmentsSchema,
  listStudentEnrollmentsQuerySchema,
  syncStaleEnrollmentsSchema,
  transferStudentEnrollmentSchema,
  withdrawStudentEnrollmentSchema,
  type CloseSemesterEnrollmentsInput,
  type CopySemesterEnrollmentsInput,
  type CreateStudentEnrollmentInput,
  type ListStudentEnrollmentsQuery,
  type SyncStaleEnrollmentsInput,
  type TransferStudentEnrollmentInput,
  type WithdrawStudentEnrollmentInput,
} from '@/modules/student-enrollments/schemas/student-enrollment.schema';
import { StudentEnrollmentsService } from '@/modules/student-enrollments/student-enrollments.service';

@ApiTags('Student Enrollments')
@ApiCookieAuth('access_token')
@Controller('student-enrollments')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class StudentEnrollmentsController {
  constructor(
    private readonly studentEnrollmentsService: StudentEnrollmentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách ghi danh lớp hành chính' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listStudentEnrollmentsQuerySchema))
    query: ListStudentEnrollmentsQuery,
  ) {
    const result = await this.studentEnrollmentsService.list(
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

  @Post('copy-from-semester')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sao chép ghi danh ACTIVE từ học kỳ nguồn sang học kỳ đích (vd. HK1 → HK2)',
  })
  async copyFromSemester(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(copySemesterEnrollmentsSchema))
    body: CopySemesterEnrollmentsInput,
  ) {
    const data = await this.studentEnrollmentsService.copyFromSemester(
      user.activeSchoolId,
      body,
    );

    const closeSuffix =
      data.sourceClosedCount > 0
        ? `; đã đóng ${data.sourceClosedCount} ghi danh ${data.sourceSemesterCode}`
        : '';

    return {
      success: true,
      data,
      message: `Đã tạo ${data.createdCount} ghi danh (${data.sourceSemesterCode} → ${data.targetSemesterCode})${closeSuffix}`,
    };
  }

  @Post('close-semester')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đóng ghi danh ACTIVE của học kỳ (ACTIVE → SEMESTER_COMPLETED)',
  })
  async closeSemester(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(closeSemesterEnrollmentsSchema))
    body: CloseSemesterEnrollmentsInput,
  ) {
    const data = await this.studentEnrollmentsService.closeSemesterEnrollments(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: `Đã đóng ${data.closedCount} ghi danh học kỳ ${data.semesterCode}`,
    };
  }

  @Post('sync-stale')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Đóng ghi danh ACTIVE ở các học kỳ không hiện hành trong năm học',
  })
  async syncStale(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(syncStaleEnrollmentsSchema))
    body: SyncStaleEnrollmentsInput,
  ) {
    const data = await this.studentEnrollmentsService.syncStaleEnrollments(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: `Đã đóng ${data.closedCount} ghi danh ở học kỳ không hiện hành`,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết ghi danh' })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    return this.studentEnrollmentsService.findById(user.activeSchoolId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ghi danh học sinh vào lớp hành chính' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createStudentEnrollmentSchema))
    body: CreateStudentEnrollmentInput,
  ) {
    const data = await this.studentEnrollmentsService.create(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Ghi danh học sinh thành công',
    };
  }

  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chuyển học sinh sang lớp hành chính khác' })
  async transfer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(transferStudentEnrollmentSchema))
    body: TransferStudentEnrollmentInput,
  ) {
    const data = await this.studentEnrollmentsService.transfer(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Chuyển lớp thành công',
    };
  }

  @Patch(':id/withdraw')
  @ApiOperation({ summary: 'Rút học sinh khỏi lớp hành chính' })
  async withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(withdrawStudentEnrollmentSchema))
    body: WithdrawStudentEnrollmentInput,
  ) {
    const data = await this.studentEnrollmentsService.withdraw(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Rút khỏi lớp thành công',
    };
  }
}
