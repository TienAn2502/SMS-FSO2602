import {
  Body,
  Controller,
  Delete,
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
  createTimetableEntrySchema,
  listTimetableEntriesQuerySchema,
  timetableMatrixQuerySchema,
  updateTimetableEntrySchema,
  type CreateTimetableEntryInput,
  type ListTimetableEntriesQuery,
  type TimetableMatrixQuery,
  type UpdateTimetableEntryInput,
} from '@/modules/timetable-entries/schemas/timetable-entry.schema';
import { TimetableEntriesService } from '@/modules/timetable-entries/timetable-entries.service';

@ApiTags('Timetable Entries')
@ApiCookieAuth('access_token')
@Controller('timetable-entries')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class TimetableEntriesController {
  constructor(
    private readonly timetableEntriesService: TimetableEntriesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách thời khóa biểu (mặc định: học kỳ hiện hành của trường)',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listTimetableEntriesQuerySchema))
    query: ListTimetableEntriesQuery,
  ) {
    const result = await this.timetableEntriesService.list(
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

  @Get('matrix')
  @ApiOperation({
    summary: 'Thời khóa biểu dạng ma trận (không phân trang, tối đa 1000 tiết)',
  })
  async listMatrix(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(timetableMatrixQuerySchema))
    query: TimetableMatrixQuery,
  ) {
    const data = await this.timetableEntriesService.listForMatrix(
      user.activeSchoolId,
      query,
    );

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết tiết thời khóa biểu' })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    return this.timetableEntriesService.findById(user.activeSchoolId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo tiết thời khóa biểu' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createTimetableEntrySchema))
    body: CreateTimetableEntryInput,
  ) {
    const data = await this.timetableEntriesService.create(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tạo tiết thời khóa biểu thành công',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật tiết thời khóa biểu' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateTimetableEntrySchema))
    body: UpdateTimetableEntryInput,
  ) {
    const data = await this.timetableEntriesService.update(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật tiết thời khóa biểu thành công',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tiết thời khóa biểu (soft delete INACTIVE)' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const data = await this.timetableEntriesService.remove(
      user.activeSchoolId,
      id,
    );

    return {
      success: true,
      data,
      message: 'Xóa tiết thời khóa biểu thành công',
    };
  }
}
