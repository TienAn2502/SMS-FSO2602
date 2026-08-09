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
  createTeacherSchema,
  createTeacherUserSchema,
  linkTeacherUserSchema,
  listTeachersQuerySchema,
  updateTeacherSchema,
  updateTeacherStatusSchema,
  type CreateTeacherInput,
  type CreateTeacherUserInput,
  type LinkTeacherUserInput,
  type ListTeachersQuery,
  type UpdateTeacherInput,
  type UpdateTeacherStatusInput,
} from '@/modules/teachers/schemas/teacher.schema';
import { TeachersService } from '@/modules/teachers/teachers.service';

@ApiTags('Teachers')
@ApiCookieAuth('access_token')
@Controller('teachers')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách giáo viên' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listTeachersQuerySchema))
    query: ListTeachersQuery,
  ) {
    const result = await this.teachersService.list(user.activeSchoolId, query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết giáo viên' })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    return this.teachersService.findById(user.activeSchoolId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo hồ sơ giáo viên' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createTeacherSchema)) body: CreateTeacherInput,
  ) {
    const data = await this.teachersService.create(user.activeSchoolId, body);

    return {
      success: true,
      data,
      message: 'Tạo hồ sơ giáo viên thành công',
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái giáo viên' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateTeacherStatusSchema))
    body: UpdateTeacherStatusInput,
  ) {
    const data = await this.teachersService.updateStatus(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật trạng thái giáo viên thành công',
    };
  }

  // Đã có tài khoản, gắn tài khoản vào hồ sơ giáo viên
  @Post(':id/link-user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gắn tài khoản giáo viên có sẵn' })
  async linkUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(linkTeacherUserSchema))
    body: LinkTeacherUserInput,
  ) {
    const data = await this.teachersService.linkUser(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Gắn tài khoản giáo viên thành công',
    };
  }

  @Post(':id/create-user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo tài khoản và gắn vào hồ sơ giáo viên' })
  async createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(createTeacherUserSchema))
    body: CreateTeacherUserInput,
  ) {
    const data = await this.teachersService.createUser(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tạo tài khoản giáo viên thành công',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật hồ sơ giáo viên' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateTeacherSchema)) body: UpdateTeacherInput,
  ) {
    const data = await this.teachersService.update(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật hồ sơ giáo viên thành công',
    };
  }
}
