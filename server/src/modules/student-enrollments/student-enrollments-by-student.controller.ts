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
import {
  listStudentEnrollmentsQuerySchema,
  type ListStudentEnrollmentsQuery,
} from '@/modules/student-enrollments/schemas/student-enrollment.schema';
import { StudentEnrollmentsService } from '@/modules/student-enrollments/student-enrollments.service';

@ApiTags('Student Enrollments')
@ApiCookieAuth('access_token')
@Controller('students')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class StudentEnrollmentsByStudentController {
  constructor(
    private readonly studentEnrollmentsService: StudentEnrollmentsService,
  ) {}

  @Get(':studentId/enrollments')
  @ApiOperation({ summary: 'Lịch sử ghi danh của học sinh' })
  async listByStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', new ZodValidationPipe(uuidParamSchema))
    studentId: string,
    @Query(new ZodValidationPipe(listStudentEnrollmentsQuerySchema))
    query: ListStudentEnrollmentsQuery,
  ) {
    const result = await this.studentEnrollmentsService.listByStudent(
      user.activeSchoolId,
      studentId,
      query,
    );

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }
}
