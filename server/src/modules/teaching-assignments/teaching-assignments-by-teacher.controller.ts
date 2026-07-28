import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
  listTeachingAssignmentsQuerySchema,
  type ListTeachingAssignmentsQuery,
} from './schemas/teaching-assignment.schema';
import { TeachingAssignmentsService } from './teaching-assignments.service';

@ApiTags('Teaching Assignments')
@ApiCookieAuth('access_token')
@Controller('teachers')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class TeachingAssignmentsByTeacherController {
  constructor(
    private readonly teachingAssignmentsService: TeachingAssignmentsService,
  ) {}

  @Get(':teacherId/teaching-assignments')
  @ApiOperation({
    summary:
      'Phân công giảng dạy theo giáo viên (mặc định: học kỳ hiện hành của trường)',
  })
  async listByTeacher(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teacherId', new ZodValidationPipe(uuidParamSchema))
    teacherId: string,
    @Query(new ZodValidationPipe(listTeachingAssignmentsQuerySchema))
    query: ListTeachingAssignmentsQuery,
  ) {
    const result = await this.teachingAssignmentsService.listByTeacher(
      user.activeSchoolId,
      teacherId,
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
