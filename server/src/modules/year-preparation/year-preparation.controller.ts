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
import {
  prepareNextYearPreviewQuerySchema,
  prepareNextYearSchema,
  type PrepareNextYearInput,
  type PrepareNextYearPreviewQuery,
} from '@/modules/year-preparation/schemas/year-preparation.schema';
import { YearPreparationService } from '@/modules/year-preparation/year-preparation.service';

@ApiTags('Year preparation')
@ApiCookieAuth('access_token')
@Controller('year-preparation')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class YearPreparationController {
  constructor(
    private readonly yearPreparationService: YearPreparationService,
  ) {}

  @Get('preview')
  @ApiOperation({
    summary:
      'Xem trước chuẩn bị năm sau: lớp HC sẽ tạo, số HS map, ghi danh (ước lượng)',
  })
  async preview(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(prepareNextYearPreviewQuerySchema))
    query: PrepareNextYearPreviewQuery,
  ) {
    const data = await this.yearPreparationService.preview(
      user.activeSchoolId,
      query,
    );

    return {
      success: true,
      data,
      message: 'Xem trước chuẩn bị năm sau thành công',
    };
  }

  @Post('prepare-next-year')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Tự tạo lớp HC năm sau, gán nextHomeroomClassId, tùy chọn tạo ghi danh',
  })
  async prepareNextYear(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(prepareNextYearSchema))
    body: PrepareNextYearInput,
  ) {
    const data = await this.yearPreparationService.prepare(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Chuẩn bị năm sau thành công',
    };
  }
}
