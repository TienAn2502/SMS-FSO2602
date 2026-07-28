import {
  Controller,
  Get,
  Param,
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
  listAttendanceSessionsQuerySchema,
  type ListAttendanceSessionsQuery,
} from './schemas/attendance-session.schema';
import { AttendanceSessionsService } from './attendance-sessions.service';

@ApiTags('Attendance Sessions')
@ApiCookieAuth('access_token')
@Controller('attendance-sessions')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class AttendanceSessionsController {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Danh sách phiên điểm danh (mặc định: học kỳ hiện hành của trường)',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listAttendanceSessionsQuerySchema))
    query: ListAttendanceSessionsQuery,
  ) {
    const result = await this.attendanceSessionsService.list(
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
  @ApiOperation({ summary: 'Chi tiết phiên điểm danh (kèm bản ghi HS, chỉ xem)' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const data = await this.attendanceSessionsService.findById(
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
