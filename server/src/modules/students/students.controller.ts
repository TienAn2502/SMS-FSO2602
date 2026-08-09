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
  createStudentSchema,
  createStudentUserSchema,
  linkStudentUserSchema,
  listStudentsQuerySchema,
  updateStudentSchema,
  updateStudentStatusSchema,
  type CreateStudentInput,
  type CreateStudentUserInput,
  type LinkStudentUserInput,
  type ListStudentsQuery,
  type UpdateStudentInput,
  type UpdateStudentStatusInput,
} from '@/modules/students/schemas/student.schema';
import { StudentsService } from '@/modules/students/students.service';

@ApiTags('Students')
@ApiCookieAuth('access_token')
@Controller('students')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách học sinh' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listStudentsQuerySchema))
    query: ListStudentsQuery,
  ) {
    const result = await this.studentsService.list(user.activeSchoolId, query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết học sinh' })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    return this.studentsService.findById(user.activeSchoolId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo hồ sơ học sinh' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createStudentSchema)) body: CreateStudentInput,
  ) {
    const data = await this.studentsService.create(user.activeSchoolId, body);

    return {
      success: true,
      data,
      message: 'Tạo hồ sơ học sinh thành công',
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái học sinh' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateStudentStatusSchema))
    body: UpdateStudentStatusInput,
  ) {
    const data = await this.studentsService.updateStatus(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật trạng thái học sinh thành công',
    };
  }

  @Post(':id/link-user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gắn tài khoản học sinh có sẵn' })
  async linkUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(linkStudentUserSchema))
    body: LinkStudentUserInput,
  ) {
    const data = await this.studentsService.linkUser(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Gắn tài khoản học sinh thành công',
    };
  }

  // Dùng khi đã có hồ sơ HS (student) nhưng chưa có tài khoản (user)
  @Post(':id/create-user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo tài khoản và gắn vào hồ sơ học sinh' })
  async createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(createStudentUserSchema))
    body: CreateStudentUserInput,
  ) {
    const data = await this.studentsService.createUser(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tạo tài khoản học sinh thành công',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật hồ sơ học sinh' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateStudentSchema)) body: UpdateStudentInput,
  ) {
    const data = await this.studentsService.update(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật hồ sơ học sinh thành công',
    };
  }
}
