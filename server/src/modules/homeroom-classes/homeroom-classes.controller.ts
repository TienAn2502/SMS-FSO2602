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
import { HomeroomClassesService } from '@/modules/homeroom-classes/homeroom-classes.service';
import {
  createHomeroomClassSchema,
  listHomeroomClassesQuerySchema,
  updateHomeroomClassSchema,
  updateHomeroomClassStatusSchema,
  type CreateHomeroomClassInput,
  type ListHomeroomClassesQuery,
  type UpdateHomeroomClassInput,
  type UpdateHomeroomClassStatusInput,
} from '@/modules/homeroom-classes/schemas/homeroom-class.schema';

@ApiTags('Homeroom Classes')
@ApiCookieAuth('access_token')
@Controller('homeroom-classes')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class HomeroomClassesController {
  constructor(
    private readonly homeroomClassesService: HomeroomClassesService,
  ) {}

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Danh sách lớp hành chính' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listHomeroomClassesQuerySchema))
    query: ListHomeroomClassesQuery,
  ) {
    const result = await this.homeroomClassesService.list(
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
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Chi tiết lớp hành chính' })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    return this.homeroomClassesService.findById(user.activeSchoolId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo lớp hành chính' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createHomeroomClassSchema))
    body: CreateHomeroomClassInput,
  ) {
    const data = await this.homeroomClassesService.create(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tạo lớp hành chính thành công',
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái lớp hành chính' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateHomeroomClassStatusSchema))
    body: UpdateHomeroomClassStatusInput,
  ) {
    const data = await this.homeroomClassesService.updateStatus(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật trạng thái lớp hành chính thành công',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật lớp hành chính' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateHomeroomClassSchema))
    body: UpdateHomeroomClassInput,
  ) {
    const data = await this.homeroomClassesService.update(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật lớp hành chính thành công',
    };
  }
}
