import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilePurpose, type File } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import type { EnvConfig } from '@/common/config/env.schema';
import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MIME_TO_EXTENSION,
  type AllowedImageMimeType,
} from '@/modules/files/constants/file-upload.constants';
import { toFileResponse, type FileResponse } from '@/modules/files/mappers/file.mapper';
import { R2Service } from '@/modules/files/r2.service';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: R2Service,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async upload(
    schoolId: string,
    uploadedById: string,
    file: Express.Multer.File,
    purpose: FilePurpose,
  ): Promise<FileResponse> {
    this.validateUploadFile(file);

    const school = await this.prisma.school.findFirst({
      where: { id: schoolId },
      select: { id: true, code: true },
    });

    if (!school) {
      throw new AppException(
        'SCHOOL_NOT_FOUND',
        'Không tìm thấy trường',
        HttpStatus.NOT_FOUND,
      );
    }

    const fileId = randomUUID();
    const mimeType = file.mimetype as AllowedImageMimeType;
    const extension = MIME_TO_EXTENSION[mimeType];
    const storageKey = this.buildStorageKey(
      school.code,
      purpose,
      fileId,
      extension,
    );

    try {
      await this.r2Service.uploadObject(storageKey, file.buffer, mimeType);
    } catch {
      throw new AppException(
        'R2_UPLOAD_FAILED',
        'Upload file thất bại',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const created = await this.prisma.file.create({
      data: {
        id: fileId,
        schoolId,
        purpose,
        originalName: file.originalname,
        mimeType,
        sizeBytes: file.size,
        storageKey,
        uploadedById,
      },
    });

    const url = await this.r2Service.createPresignedUrl(storageKey);

    return toFileResponse(created, { url });
  }

  async getById(schoolId: string, fileId: string): Promise<FileResponse> {
    const file = await this.findActiveFileInTenant(schoolId, fileId);
    return toFileResponse(file);
  }

  async getSignedUrl(
    schoolId: string,
    fileId: string,
  ): Promise<{ url: string; expiresInSec: number }> {
    const file = await this.findActiveFileInTenant(schoolId, fileId);
    const url = await this.r2Service.createPresignedUrl(file.storageKey);
    const expiresInSec = this.configService.get('R2_SIGNED_URL_EXPIRES_SEC', {
      infer: true,
    });

    return { url, expiresInSec };
  }

  async softDelete(schoolId: string, fileId: string): Promise<FileResponse> {
    const file = await this.findActiveFileInTenant(schoolId, fileId);

    const updated = await this.prisma.file.update({
      where: { id: file.id },
      data: { status: 'INACTIVE' },
    });

    return toFileResponse(updated);
  }

  async assertFileInTenant(
    schoolId: string,
    fileId: string,
    expectedPurpose?: FilePurpose,
  ): Promise<File> {
    const file = await this.findActiveFileInTenant(schoolId, fileId);

    if (expectedPurpose && file.purpose !== expectedPurpose) {
      throw new AppException(
        'VALIDATION_ERROR',
        'File không đúng mục đích sử dụng',
        HttpStatus.BAD_REQUEST,
      );
    }

    return file;
  }

  private validateUploadFile(file: Express.Multer.File | undefined): void {
    // Validate xem file có tồn tại không
    if (!file) {
      throw new AppException(
        'VALIDATION_ERROR',
        'File upload là bắt buộc',
        HttpStatus.BAD_REQUEST,
      );
    }

    const maxSizeBytes = this.configService.get('R2_MAX_FILE_SIZE_BYTES', {
      infer: true,
    });

    // Validate dung lượng file
    if (file.size > maxSizeBytes) {
      throw new AppException(
        'FILE_TOO_LARGE',
        'File vượt quá giới hạn dung lượng cho phép',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate xem file có đúng loại MIME type cho phép không
    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype as AllowedImageMimeType)
    ) {
      throw new AppException(
        'FILE_TYPE_NOT_ALLOWED',
        'Loại file không được phép',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async findActiveFileInTenant(
    schoolId: string,
    fileId: string,
  ): Promise<File> {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        schoolId,
        status: 'ACTIVE',
      },
    });

    if (!file) {
      throw new AppException(
        'FILE_NOT_FOUND',
        'Không tìm thấy file',
        HttpStatus.NOT_FOUND,
      );
    }

    return file;
  }

  private buildStorageKey(
    schoolCode: string,
    purpose: FilePurpose,
    fileId: string,
    extension: string,
  ): string {
    switch (purpose) {
      case FilePurpose.SCHOOL_LOGO:
        return `schools/${schoolCode}/logo/${fileId}.${extension}`;
      case FilePurpose.STUDENT_AVATAR:
        return `schools/${schoolCode}/students/avatars/${fileId}.${extension}`;
      default:
        return `schools/${schoolCode}/other/${fileId}.${extension}`;
    }
  }
}
