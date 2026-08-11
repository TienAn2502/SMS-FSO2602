import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { ClassPlacementService } from '@/modules/class-placement/class-placement.service';
import {
  assignClassPlacementSchema,
  autoBalanceClassPlacementSchema,
  autoBalancePreviewQuerySchema,
  listUnassignedPlacementQuerySchema,
  type AssignClassPlacementInput,
  type AutoBalanceClassPlacementInput,
  type AutoBalancePreviewQuery,
  type ListUnassignedPlacementQuery,
} from '@/modules/class-placement/schemas/class-placement.schema';

@ApiTags('Class placement')
@ApiCookieAuth('access_token')
@Controller('class-placement')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class ClassPlacementController {
  constructor(private readonly classPlacementService: ClassPlacementService) {}

  @Get('unassigned')
  @ApiOperation({
    summary:
      'Danh sách HS chưa có lớp trong học kỳ (ở lại / mới lên cấp)',
  })
  async listUnassigned(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listUnassignedPlacementQuerySchema))
    query: ListUnassignedPlacementQuery,
  ) {
    const data = await this.classPlacementService.listUnassigned(
      user.activeSchoolId,
      query,
    );

    return {
      success: true,
      data: data.items,
      meta: data.meta,
      message: 'Lấy danh sách HS chưa xếp lớp thành công',
    };
  }

  @Get('auto-balance/preview')
  @ApiOperation({ summary: 'Xem trước chia đều HS vào lớp theo khối' })
  async previewAutoBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(autoBalancePreviewQuerySchema))
    query: AutoBalancePreviewQuery,
  ) {
    const data = await this.classPlacementService.previewAutoBalance(
      user.activeSchoolId,
      query,
    );

    return {
      success: true,
      data,
      message: 'Xem trước chia đều lớp thành công',
    };
  }

  @Post('assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xếp lớp thủ công (tạo ghi danh ACTIVE)' })
  async assign(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(assignClassPlacementSchema))
    body: AssignClassPlacementInput,
  ) {
    const data = await this.classPlacementService.assign(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Xếp lớp thành công',
    };
  }

  @Post('auto-balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chia đều HS chưa xếp vào các lớp của khối' })
  async autoBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(autoBalanceClassPlacementSchema))
    body: AutoBalanceClassPlacementInput,
  ) {
    const data = await this.classPlacementService.autoBalance(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Chia đều lớp thành công',
    };
  }
}
