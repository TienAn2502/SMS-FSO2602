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
  copySemesterTeachingAssignmentsSchema,
  createTeachingAssignmentSchema,
  listTeachingAssignmentsQuerySchema,
  updateTeachingAssignmentStatusSchema,
  type CopySemesterTeachingAssignmentsInput,
  type CreateTeachingAssignmentInput,
  type ListTeachingAssignmentsQuery,
  type UpdateTeachingAssignmentStatusInput,
} from '@/modules/teaching-assignments/schemas/teaching-assignment.schema';
import { TeachingAssignmentsService } from '@/modules/teaching-assignments/teaching-assignments.service';

@ApiTags('Teaching Assignments')
@ApiCookieAuth('access_token')
@Controller('teaching-assignments')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class TeachingAssignmentsController {
  constructor(
    private readonly teachingAssignmentsService: TeachingAssignmentsService,
  ) {}

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({
    summary:
      'Danh sách phân công giảng dạy (mặc định: học kỳ hiện hành của trường)',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listTeachingAssignmentsQuerySchema))
    query: ListTeachingAssignmentsQuery,
  ) {
    const result = await this.teachingAssignmentsService.list(
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
    summary:
      'Sao chép phân công ACTIVE từ học kỳ nguồn sang học kỳ đích (vd. HK1 → HK2)',
  })
  async copyFromSemester(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(copySemesterTeachingAssignmentsSchema))
    body: CopySemesterTeachingAssignmentsInput,
  ) {
    const data = await this.teachingAssignmentsService.copyFromSemester(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: `Đã sao chép ${data.createdCount} phân công (${data.sourceSemesterCode} → ${data.targetSemesterCode})`,
    };
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Chi tiết phân công giảng dạy' })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    return this.teachingAssignmentsService.findById(user.activeSchoolId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Phân công giáo viên dạy lớp môn' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createTeachingAssignmentSchema))
    body: CreateTeachingAssignmentInput,
  ) {
    const data = await this.teachingAssignmentsService.create(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Phân công giảng dạy thành công',
    };
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái phân công (kết thúc / kích hoạt)',
  })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateTeachingAssignmentStatusSchema))
    body: UpdateTeachingAssignmentStatusInput,
  ) {
    const data = await this.teachingAssignmentsService.updateStatus(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật trạng thái phân công thành công',
    };
  }
}
