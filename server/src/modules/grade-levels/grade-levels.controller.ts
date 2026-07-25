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
import { GradeLevelsService } from './grade-levels.service';
import {
  createGradeLevelSchema,
  listGradeLevelsQuerySchema,
  updateGradeLevelSchema,
  type CreateGradeLevelInput,
  type ListGradeLevelsQuery,
  type UpdateGradeLevelInput,
} from './schemas/grade-level.schema';

@ApiTags('Grade Levels')
@ApiCookieAuth('access_token')
@Controller('grade-levels')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class GradeLevelsController {
  constructor(private readonly gradeLevelsService: GradeLevelsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách khối' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listGradeLevelsQuerySchema))
    query: ListGradeLevelsQuery,
  ) {
    const result = await this.gradeLevelsService.list(
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
  @ApiOperation({ summary: 'Chi tiết khối' })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    return this.gradeLevelsService.findById(user.activeSchoolId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo khối' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createGradeLevelSchema))
    body: CreateGradeLevelInput,
  ) {
    const data = await this.gradeLevelsService.create(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tạo khối thành công',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật khối' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateGradeLevelSchema))
    body: UpdateGradeLevelInput,
  ) {
    const data = await this.gradeLevelsService.update(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật khối thành công',
    };
  }
}
