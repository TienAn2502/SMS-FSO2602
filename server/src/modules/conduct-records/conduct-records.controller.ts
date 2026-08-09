import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
import { ConductRecordsService } from '@/modules/conduct-records/conduct-records.service';
import {
  bulkUpsertConductRecordsSchema,
  finalizeConductRecordsSchema,
  listConductRecordsQuerySchema,
  type BulkUpsertConductRecordsInput,
  type FinalizeConductRecordsInput,
  type ListConductRecordsQuery,
} from '@/modules/conduct-records/schemas/conduct-record.schema';

@ApiTags('Conduct records')
@ApiCookieAuth('access_token')
@Controller('conduct-records')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class ConductRecordsController {
  constructor(private readonly conductRecordsService: ConductRecordsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách hạnh kiểm' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listConductRecordsQuerySchema))
    query: ListConductRecordsQuery,
  ) {
    const result = await this.conductRecordsService.list(
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

  @Put('bulk')
  @ApiOperation({ summary: 'Ghi hàng loạt hạnh kiểm' })
  async bulkUpsert(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(bulkUpsertConductRecordsSchema))
    body: BulkUpsertConductRecordsInput,
  ) {
    const data = await this.conductRecordsService.bulkUpsert(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Ghi hạnh kiểm thành công',
    };
  }

  @Post('semesters/:semesterId/finalize')
  @ApiOperation({ summary: 'Khóa hạnh kiểm học kỳ theo lớp chủ nhiệm' })
  async finalize(
    @CurrentUser() user: AuthenticatedUser,
    @Param('semesterId', new ZodValidationPipe(uuidParamSchema))
    semesterId: string,
    @Body(new ZodValidationPipe(finalizeConductRecordsSchema))
    body: FinalizeConductRecordsInput,
  ) {
    const data = await this.conductRecordsService.finalizeSemester(
      user.activeSchoolId,
      semesterId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Khóa hạnh kiểm thành công',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết hạnh kiểm' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const data = await this.conductRecordsService.findById(
      user.activeSchoolId,
      id,
    );

    return {
      success: true,
      data,
      message: null,
    };
  }
}
