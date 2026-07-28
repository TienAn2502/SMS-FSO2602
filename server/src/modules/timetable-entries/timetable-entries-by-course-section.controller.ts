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
  listTimetableEntriesQuerySchema,
  type ListTimetableEntriesQuery,
} from './schemas/timetable-entry.schema';
import { TimetableEntriesService } from './timetable-entries.service';

@ApiTags('Timetable Entries')
@ApiCookieAuth('access_token')
@Controller('course-sections')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class TimetableEntriesByCourseSectionController {
  constructor(
    private readonly timetableEntriesService: TimetableEntriesService,
  ) {}

  @Get(':courseSectionId/timetable-entries')
  @ApiOperation({ summary: 'Thời khóa biểu theo lớp môn' })
  async listByCourseSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSectionId', new ZodValidationPipe(uuidParamSchema))
    courseSectionId: string,
    @Query(new ZodValidationPipe(listTimetableEntriesQuerySchema))
    query: ListTimetableEntriesQuery,
  ) {
    const result = await this.timetableEntriesService.listByCourseSection(
      user.activeSchoolId,
      courseSectionId,
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
