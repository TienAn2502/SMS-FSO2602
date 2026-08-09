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
  createSubjectSchema,
  listSubjectsQuerySchema,
  updateSubjectSchema,
  updateSubjectStatusSchema,
  type CreateSubjectInput,
  type ListSubjectsQuery,
  type UpdateSubjectInput,
  type UpdateSubjectStatusInput,
} from '@/modules/subjects/schemas/subject.schema';
import { SubjectsService } from '@/modules/subjects/subjects.service';

@ApiTags('Subjects')
@ApiCookieAuth('access_token')
@Controller('subjects')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Danh sách môn học' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listSubjectsQuerySchema))
    query: ListSubjectsQuery,
  ) {
    const result = await this.subjectsService.list(user.activeSchoolId, query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Chi tiết môn học' })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    return this.subjectsService.findById(user.activeSchoolId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo môn học' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createSubjectSchema)) body: CreateSubjectInput,
  ) {
    const data = await this.subjectsService.create(user.activeSchoolId, body);

    return {
      success: true,
      data,
      message: 'Tạo môn học thành công',
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái môn học' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateSubjectStatusSchema))
    body: UpdateSubjectStatusInput,
  ) {
    const data = await this.subjectsService.updateStatus(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật trạng thái môn học thành công',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật môn học' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateSubjectSchema)) body: UpdateSubjectInput,
  ) {
    const data = await this.subjectsService.update(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật môn học thành công',
    };
  }
}
