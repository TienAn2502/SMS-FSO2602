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
import { AcademicYearsService } from '@/modules/academic-years/academic-years.service';
import {
  createAcademicYearSchema,
  listAcademicYearsQuerySchema,
  updateAcademicYearSchema,
  updateAcademicYearStatusSchema,
  type CreateAcademicYearInput,
  type ListAcademicYearsQuery,
  type UpdateAcademicYearInput,
  type UpdateAcademicYearStatusInput,
} from '@/modules/academic-years/schemas/academic-year.schema';

@ApiTags('Academic Years')
@ApiCookieAuth('access_token')
@Controller('academic-years')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Danh sách năm học' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listAcademicYearsQuerySchema))
    query: ListAcademicYearsQuery,
  ) {
    const result = await this.academicYearsService.list(
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

  @Get('current')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Năm học hiện hành' })
  findCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.academicYearsService.findCurrent(user.activeSchoolId);
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Chi tiết năm học' })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    return this.academicYearsService.findById(user.activeSchoolId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo năm học' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createAcademicYearSchema))
    body: CreateAcademicYearInput,
  ) {
    const data = await this.academicYearsService.create(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tạo năm học thành công',
    };
  }

  @Patch(':id/set-current')
  @ApiOperation({ summary: 'Đặt làm năm học hiện hành' })
  async setCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const data = await this.academicYearsService.setCurrent(
      user.activeSchoolId,
      id,
    );

    return {
      success: true,
      data,
      message: 'Đặt năm học hiện hành thành công',
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái năm học' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateAcademicYearStatusSchema))
    body: UpdateAcademicYearStatusInput,
  ) {
    const data = await this.academicYearsService.updateStatus(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật trạng thái năm học thành công',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật năm học' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateAcademicYearSchema))
    body: UpdateAcademicYearInput,
  ) {
    const data = await this.academicYearsService.update(
      user.activeSchoolId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật năm học thành công',
    };
  }
}
