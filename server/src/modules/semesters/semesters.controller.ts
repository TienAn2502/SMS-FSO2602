import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
  createSemesterSchema,
  updateSemesterSchema,
  updateSemesterStatusSchema,
  type CreateSemesterInput,
  type UpdateSemesterInput,
  type UpdateSemesterStatusInput,
} from '@/modules/semesters/schemas/semester.schema';
import { SemestersService } from '@/modules/semesters/semesters.service';

@ApiTags('Semesters')
@ApiCookieAuth('access_token')
@Controller('academic-years/:yearId/semesters')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class SemestersController {
  constructor(private readonly semestersService: SemestersService) {}

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Danh sách học kỳ theo năm học' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('yearId', new ZodValidationPipe(uuidParamSchema)) yearId: string,
  ) {
    const data = await this.semestersService.list(user.activeSchoolId, yearId);

    return {
      success: true,
      data,
      message: 'Lấy danh sách học kỳ theo năm học thành công',
    };
  }

  @Get('current')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Học kỳ hiện hành trong năm học' })
  findCurrentForYear(
    @CurrentUser() user: AuthenticatedUser,
    @Param('yearId', new ZodValidationPipe(uuidParamSchema)) yearId: string,
  ) {
    return this.semestersService.findCurrentForYear(
      user.activeSchoolId,
      yearId,
    );
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Chi tiết học kỳ' })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('yearId', new ZodValidationPipe(uuidParamSchema)) yearId: string,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    return this.semestersService.findById(user.activeSchoolId, yearId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo học kỳ' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('yearId', new ZodValidationPipe(uuidParamSchema)) yearId: string,
    @Body(new ZodValidationPipe(createSemesterSchema))
    body: CreateSemesterInput,
  ) {
    const data = await this.semestersService.create(
      user.activeSchoolId,
      yearId,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tạo học kỳ thành công',
    };
  }

  @Patch(':id/set-current')
  @ApiOperation({ summary: 'Đặt làm học kỳ hiện hành' })
  async setCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('yearId', new ZodValidationPipe(uuidParamSchema)) yearId: string,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const data = await this.semestersService.setCurrent(
      user.activeSchoolId,
      yearId,
      id,
    );

    return {
      success: true,
      data,
      message: 'Đặt học kỳ hiện hành thành công',
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái học kỳ' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('yearId', new ZodValidationPipe(uuidParamSchema)) yearId: string,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateSemesterStatusSchema))
    body: UpdateSemesterStatusInput,
  ) {
    const data = await this.semestersService.updateStatus(
      user.activeSchoolId,
      yearId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật trạng thái học kỳ thành công',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật học kỳ' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('yearId', new ZodValidationPipe(uuidParamSchema)) yearId: string,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateSemesterSchema))
    body: UpdateSemesterInput,
  ) {
    const data = await this.semestersService.update(
      user.activeSchoolId,
      yearId,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật học kỳ thành công',
    };
  }
}

@ApiTags('Semesters')
@ApiCookieAuth('access_token')
@Controller('semesters')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class SemestersSchoolController {
  constructor(private readonly semestersService: SemestersService) {}

  @Get('current')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Học kỳ hiện hành của trường' })
  findCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.semestersService.findCurrentForSchool(user.activeSchoolId);
  }
}
