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

import { PlatformGuard } from '@/common/guards/platform.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '@/common/schemas/shared.schema';
import { PlatformSchoolsService } from '@/modules/platform/platform-schools.service';
import {
  createPlatformSchoolAdminSchema,
  createPlatformSchoolSchema,
  listPlatformSchoolsQuerySchema,
  updatePlatformSchoolSchema,
  updatePlatformSchoolStatusSchema,
  type CreatePlatformSchoolAdminInput,
  type CreatePlatformSchoolInput,
  type ListPlatformSchoolsQuery,
  type UpdatePlatformSchoolInput,
  type UpdatePlatformSchoolStatusInput,
} from '@/modules/platform/schemas/platform-school.schema';

@ApiTags('Platform')
@ApiCookieAuth('access_token')
@Controller('platform/schools')
@UseGuards(PlatformGuard)
export class PlatformSchoolsController {
  constructor(
    private readonly platformSchoolsService: PlatformSchoolsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách trường (system admin)' })
  async list(
    @Query(new ZodValidationPipe(listPlatformSchoolsQuerySchema))
    query: ListPlatformSchoolsQuery,
  ) {
    const result = await this.platformSchoolsService.list(query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết trường (system admin)' })
  async findById(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const data = await this.platformSchoolsService.findById(id);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo trường mới và admin trường đầu tiên' })
  async create(
    @Body(new ZodValidationPipe(createPlatformSchoolSchema))
    body: CreatePlatformSchoolInput,
  ) {
    const data = await this.platformSchoolsService.create(body);

    return {
      success: true,
      data,
      message: 'Tạo trường thành công',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật metadata trường' })
  async update(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updatePlatformSchoolSchema))
    body: UpdatePlatformSchoolInput,
  ) {
    const data = await this.platformSchoolsService.update(id, body);

    return {
      success: true,
      data,
      message: 'Cập nhật trường thành công',
    };
  }

  @Get(':id/admins')
  @ApiOperation({ summary: 'Danh sách admin trường' })
  async listAdmins(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const data = await this.platformSchoolsService.listAdmins(id);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Post(':id/admins')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Thêm admin trường' })
  async createAdmin(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(createPlatformSchoolAdminSchema))
    body: CreatePlatformSchoolAdminInput,
  ) {
    const data = await this.platformSchoolsService.createAdmin(id, body);

    return {
      success: true,
      data,
      message: 'Thêm admin trường thành công',
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Đổi trạng thái trường' })
  async updateStatus(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(updatePlatformSchoolStatusSchema))
    body: UpdatePlatformSchoolStatusInput,
  ) {
    const data = await this.platformSchoolsService.updateStatus(id, body);

    return {
      success: true,
      data,
      message: 'Cập nhật trạng thái trường thành công',
    };
  }
}
