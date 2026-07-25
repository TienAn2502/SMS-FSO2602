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
import { CourseSectionsService } from './course-sections.service';
import {
  createCourseSectionSchema,
  listCourseSectionsQuerySchema,
  updateCourseSectionSchema,
  updateCourseSectionStatusSchema,
  type CreateCourseSectionInput,
  type ListCourseSectionsQuery,
  type UpdateCourseSectionInput,
  type UpdateCourseSectionStatusInput,
} from './schemas/course-section.schema';

@ApiTags('Course Sections')
@ApiCookieAuth('access_token')
@Controller('course-sections')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class CourseSectionsController {
  constructor(private readonly courseSectionsService: CourseSectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách lớp môn học' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listCourseSectionsQuerySchema))
    query: ListCourseSectionsQuery,
  ) {
    const result = await this.courseSectionsService.list(
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
  @ApiOperation({ summary: 'Chi tiết lớp môn học' })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    return this.courseSectionsService.findById(user.activeSchoolId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo lớp môn học' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCourseSectionSchema))
    body: CreateCourseSectionInput,
  ) {
    const data = await this.courseSectionsService.create(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tạo lớp môn học thành công',
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái lớp môn học' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateCourseSectionStatusSchema))
    body: UpdateCourseSectionStatusInput,
  ) {
    const data = await this.courseSectionsService.updateStatus(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật trạng thái lớp môn học thành công',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật lớp môn học' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateCourseSectionSchema))
    body: UpdateCourseSectionInput,
  ) {
    const data = await this.courseSectionsService.update(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật lớp môn học thành công',
    };
  }
}
