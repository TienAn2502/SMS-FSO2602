import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '@/common/schemas/shared.schema';
import { GradeLevelsService } from '@/modules/grade-levels/grade-levels.service';
import {
  listGradeLevelsQuerySchema,
  type ListGradeLevelsQuery,
} from '@/modules/grade-levels/schemas/grade-level.schema';

@ApiTags('Grade Levels')
@ApiCookieAuth('access_token')
@Controller('grade-levels')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.SYSTEM_ADMIN)
export class GradeLevelsController {
  constructor(private readonly gradeLevelsService: GradeLevelsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách khối' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listGradeLevelsQuerySchema))
    query: ListGradeLevelsQuery,
  ) {
    const result = await this.gradeLevelsService.list(user, query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết khối' })
  findById(@Param('id', new ZodValidationPipe(uuidParamSchema)) id: string) {
    return this.gradeLevelsService.findById(id);
  }
}
