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

import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../../common/schemas/shared.schema';
import {
  createStudentEnrollmentSchema,
  listStudentEnrollmentsQuerySchema,
  transferStudentEnrollmentSchema,
  withdrawStudentEnrollmentSchema,
  type CreateStudentEnrollmentInput,
  type ListStudentEnrollmentsQuery,
  type TransferStudentEnrollmentInput,
  type WithdrawStudentEnrollmentInput,
} from './schemas/student-enrollment.schema';
import { StudentEnrollmentsService } from './student-enrollments.service';

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
