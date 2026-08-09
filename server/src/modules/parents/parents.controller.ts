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
  createParentSchema,
  createParentUserSchema,
  linkParentStudentSchema,
  linkParentUserSchema,
  listParentsQuerySchema,
  updateParentSchema,
  updateParentStatusSchema,
  type CreateParentInput,
  type CreateParentUserInput,
  type LinkParentStudentInput,
  type LinkParentUserInput,
  type ListParentsQuery,
  type UpdateParentInput,
  type UpdateParentStatusInput,
} from '@/modules/parents/schemas/parent.schema';
import { ParentsService } from '@/modules/parents/parents.service';

@ApiTags('Parents')
@ApiCookieAuth('access_token')
@Controller('parents')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách phụ huynh' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listParentsQuerySchema))
    query: ListParentsQuery,
  ) {
    const result = await this.parentsService.list(user.activeSchoolId, query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết phụ huynh' })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    return this.parentsService.findById(user.activeSchoolId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo hồ sơ phụ huynh' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createParentSchema)) body: CreateParentInput,
  ) {
    const data = await this.parentsService.create(user.activeSchoolId, body);

    return {
      success: true,
      data,
      message: 'Tạo hồ sơ phụ huynh thành công',
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái phụ huynh' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateParentStatusSchema))
    body: UpdateParentStatusInput,
  ) {
    const data = await this.parentsService.updateStatus(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật trạng thái phụ huynh thành công',
    };
  }

  @Post(':id/link-user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gắn tài khoản phụ huynh có sẵn' })
  async linkUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(linkParentUserSchema))
    body: LinkParentUserInput,
  ) {
    const data = await this.parentsService.linkUser(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Gắn tài khoản phụ huynh thành công',
    };
  }

  // Dành cho đã có hồ sơ phụ huynh nhưng chưa có tài khoản đăng nhập
  @Post(':id/create-user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo tài khoản và gắn vào hồ sơ phụ huynh' })
  async createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(createParentUserSchema))
    body: CreateParentUserInput,
  ) {
    const data = await this.parentsService.createUser(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tạo tài khoản phụ huynh thành công',
    };
  }

  @Post(':id/link-student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gắn học sinh vào phụ huynh' })
  async linkStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(linkParentStudentSchema))
    body: LinkParentStudentInput,
  ) {
    const data = await this.parentsService.linkStudent(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Gắn học sinh thành công',
    };
  }

  @Delete(':id/students/:studentId')
  @ApiOperation({ summary: 'Gỡ liên kết học sinh' })
  async unlinkStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Param('studentId', new ZodValidationPipe(uuidParamSchema))
    studentId: string,
  ) {
    const data = await this.parentsService.unlinkStudent(
      user.activeSchoolId,
      id,
      studentId,
    );

    return {
      success: true,
      data,
      message: 'Gỡ liên kết học sinh thành công',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật hồ sơ phụ huynh' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateParentSchema)) body: UpdateParentInput,
  ) {
    const data = await this.parentsService.update(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật hồ sơ phụ huynh thành công',
    };
  }
}
