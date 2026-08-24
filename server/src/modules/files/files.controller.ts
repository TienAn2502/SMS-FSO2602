import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FilePurpose, UserRole } from '@prisma/client';
import { z } from 'zod';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AppException } from '@/common/exceptions/app.exception';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import {
  type BatchPromoteRequest,
  batchPromoteSchema,
  uuidParamSchema,
} from '@/common/schemas/shared.schema';
import { UPLOAD_PURPOSES } from '@/modules/files/constants/file-upload.constants';
import { FilesService } from '@/modules/files/files.service';

const uploadPurposeSchema = z.enum([
  FilePurpose.SCHOOL_LOGO,
  FilePurpose.STUDENT_AVATAR,
  FilePurpose.BLOG_IMAGE,
  FilePurpose.BLOG_THUMBNAIL,
  FilePurpose.NOTIFICATION_THUMBNAIL,
  FilePurpose.NOTIFICATION_IMAGE,
  FilePurpose.OTHER,
]);

@ApiTags('Files')
@ApiCookieAuth('access_token')
@Controller('files')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file (logo, avatar, blog image…)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'purpose', 'mimeType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        purpose: {
          type: 'string',
          enum: UPLOAD_PURPOSES,
        },
        mimeType: { type: 'string' },
      },
    },
  })
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('purpose') purposeRaw: string,
    @Body('mimeType') mimeType: string,
  ) {
    const purposeResult = uploadPurposeSchema.safeParse(purposeRaw);
    if (!purposeResult.success) {
      throw new AppException(
        'VALIDATION_ERROR',
        'Mục đích file không hợp lệ',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.filesService.upload(
      user.activeSchoolId,
      user.id,
      file,
      purposeResult.data,
      mimeType,
    );

    return {
      success: true,
      data,
      message: 'Upload thành công',
    };
  }

  @Post('upload/temp')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file tạm' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'purpose', 'mimeType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        purpose: {
          type: 'string',
          enum: UPLOAD_PURPOSES,
        },
        mimeType: { type: 'string' },
      },
    },
  })
  async uploadTemp(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('purpose') purposeRaw: string,
    @Body('mimeType') mimeType: string,
  ) {
    const purposeResult = uploadPurposeSchema.safeParse(purposeRaw);
    if (!purposeResult.success) {
      throw new AppException(
        'VALIDATION_ERROR',
        'Mục đích file không hợp lệ',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.filesService.uploadTemp(
      user.activeSchoolId,
      file,
      purposeResult.data,
      mimeType,
    );

    return {
      success: true,
      data,
      message: 'Upload thành công',
    };
  }

  @Post('upload/temp/promote')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Promote file tạm lên storage chính và lưu DB' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'object',
            required: ['purpose', 'fileId'],
            properties: {
              purpose: {
                type: 'string',
                enum: UPLOAD_PURPOSES,
              },
              fileId: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
    },
  })
  async promoteTemp(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(batchPromoteSchema))
    body: BatchPromoteRequest,
  ) {
    const data = await this.filesService.batchPromoteTemp(
      user.activeSchoolId,
      user.id,
      body.files,
    );
    return {
      success: true,
      data,
      message: 'Promote thành công',
    };
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Signed URL tải/xem file' })
  async getSignedUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const data = await this.filesService.getSignedUrl(user.activeSchoolId, id);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Post('refresh-urls')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh signed URLs theo danh sách storage keys' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['storageKeys'],
      properties: {
        storageKeys: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async refreshUrls(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: { storageKeys: string[] },
  ) {
    const data = await this.filesService.refreshSignedUrls(body.storageKeys);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Metadata file' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    return this.filesService.getById(user.activeSchoolId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete file' })
  async softDelete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const data = await this.filesService.softDelete(user.activeSchoolId, id);

    return {
      success: true,
      data,
      message: 'Xóa file thành công',
    };
  }
}
