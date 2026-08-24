import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilePurpose, type File } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import type { EnvConfig } from '@/common/config/env.schema';
import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  BASE_STORAGE_KEY,
  MIME_TO_EXTENSION,
  TEMP_BLOG_IMAGE_PREFIX,
  TEMP_BLOG_THUMBNAIL_PREFIX,
  TEMP_NOTIFICATION_THUMBNAIL_PREFIX,
  TEMP_NOTIFICATION_IMAGE_PREFIX,
  type AllowedImageMimeType,
} from '@/modules/files/constants/file-upload.constants';
import {
  toFileResponse,
  type FileResponse,
} from '@/modules/files/mappers/file.mapper';
import { R2Service } from '@/modules/files/r2.service';
import { optimizeImageBuffer } from '@/modules/files/utils/optimize-image.util';
import { BatchPromoteRequest } from '@/common/schemas/shared.schema';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: R2Service,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async checkSchoolCode(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId },
      select: { code: true },
    });
    if (!school) {
      throw new AppException(
        'SCHOOL_NOT_FOUND',
        'Không tìm thấy trường',
        HttpStatus.NOT_FOUND,
      );
    }
    return school.code;
  }

  createFileInfo(file: Express.Multer.File, mimeType?: string) {
    const fileId = randomUUID();
    const resolvedMimeType = (mimeType ??
      file.mimetype) as AllowedImageMimeType;
    const extension = MIME_TO_EXTENSION[resolvedMimeType];
    return {
      fileId,
      mimeType: resolvedMimeType,
      extension,
    };
  }

  async prepareUploadFile(
    schoolId: string,
    // uploadedById: string,
    file: Express.Multer.File,
    mimeType: string,
    // purpose: FilePurpose,
  ) {
    this.validateUploadFile(file);

    const schoolCode = await this.checkSchoolCode(schoolId);
    const {
      fileId,
      mimeType: resolvedMimeType,
      extension,
    } = this.createFileInfo(file, mimeType);

    return {
      fileId,
      mimeType: resolvedMimeType,
      extension,
      schoolCode,
    };
  }

  async upload(
    schoolId: string,
    uploadedById: string,
    file: Express.Multer.File,
    purpose: FilePurpose,
    mimeType: string,
  ): Promise<FileResponse> {
    const { fileId, schoolCode } = await this.prepareUploadFile(
      schoolId,
      file,
      mimeType,
    );

    let optimized;
    try {
      optimized = await optimizeImageBuffer(file.buffer, purpose);
    } catch {
      throw new AppException(
        'VALIDATION_ERROR',
        'Không thể xử lý ảnh tải lên',
        HttpStatus.BAD_REQUEST,
      );
    }

    const storageKey = this.buildStorageKey(
      schoolCode,
      purpose,
      fileId,
      optimized.extension,
    );

    try {
      await this.r2Service.uploadObject(
        storageKey,
        optimized.buffer,
        optimized.mimeType,
      );
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
        mimeType: optimized.mimeType,
        sizeBytes: optimized.sizeBytes,
        storageKey,
        uploadedById,
      },
    });

    const url = await this.r2Service.createPresignedUrl(storageKey);

    return toFileResponse(created, { url });
  }

  async batchPromoteTemp(
    schoolId: string,
    uploadedById: string,
    files: BatchPromoteRequest['files'],
  ): Promise<{ promoted: number; files: FileResponse[] }> {
    const schoolCode = await this.checkSchoolCode(schoolId);
    const fileIds = files.map((f) => f.fileId);

    // Check for duplicates
    const uniqueFileIds = new Set(fileIds);

    if (uniqueFileIds.size !== fileIds.length) {
      throw new AppException(
        'VALIDATION_ERROR',
        'File ID bị trùng lặp',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Promote all files in transaction
    const promotedFiles: FileResponse[] = [];
    await this.prisma.$transaction(
      async () => {
        for (const fileItem of files) {
          const extension = MIME_TO_EXTENSION[fileItem.mimeType];
          const tempStorageKey = this.buildTempStorageKey(
            schoolCode,
            fileItem.fileId,
            extension,
            fileItem.purpose,
          );

          // Check xem file ảnh đó có trong folder tạm (temp) không
          const isExistedInR2 =
            await this.r2Service.listObjectsByPrefix(tempStorageKey);

          if (isExistedInR2.length <= 0) {
            throw new AppException(
              'FILE_NOT_FOUND',
              'File tạm không tồn tại',
              HttpStatus.BAD_REQUEST,
            );
          }

          // Build storage key cho file đã promoted
          const destinationStorageKey = this.buildStorageKey(
            schoolCode,
            fileItem.purpose,
            fileItem.fileId,
            extension,
          );

          // Copy tu temp
          await this.r2Service.copyObject(tempStorageKey, destinationStorageKey);

          // Insert file đã promoted vào database
          await this.prisma.file.create({
            data: {
              schoolId,
              storageKey: destinationStorageKey,
              mimeType: fileItem.mimeType,
              sizeBytes: fileItem.sizeBytes,
              uploadedById,
              originalName: fileItem.originalName,
              purpose: fileItem.purpose,
            },
          });

          // Create response with the promoted file info
          const url = await this.r2Service.createPresignedUrl(
            destinationStorageKey,
          );
          promotedFiles.push({
            id: fileItem.fileId,
            purpose: fileItem.purpose,
            originalName: fileItem.originalName,
            mimeType: fileItem.mimeType,
            sizeBytes: fileItem.sizeBytes,
            status: 'ACTIVE',
            storageKey: destinationStorageKey,
            createdAt: new Date().toISOString(),
            url,
          });
        }
      },
      { timeout: 30000 }
    );

    return {
      promoted: promotedFiles.length,
      files: promotedFiles,
    };
  }

  async uploadTemp(
    schoolId: string,
    file: Express.Multer.File,
    purpose: FilePurpose,
    mimeType?: string,
  ): Promise<{ fileId: string; url: string }> {
    const {
      fileId,
      mimeType: resolvedMimeType,
      extension,
      schoolCode,
    } = await this.prepareUploadFile(schoolId, file, mimeType ?? '');

    const storageKey = this.buildTempStorageKey(
      schoolCode,
      fileId,
      extension,
      purpose,
    );

    try {
      await this.r2Service.uploadObject(
        storageKey,
        file.buffer,
        resolvedMimeType,
      );
    } catch {
      throw new AppException(
        'R2_UPLOAD_FAILED',
        'Upload file thất bại',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const url = await this.r2Service.createPresignedUrl(storageKey);
    return { fileId, url };
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

  async refreshSignedUrls(
    storageKeys: string[],
  ): Promise<Record<string, string>> {
    const expiresInSec = this.configService.get('R2_SIGNED_URL_EXPIRES_SEC', {
      infer: true,
    });

    const urls: Record<string, string> = {};

    await Promise.all(
      storageKeys.map(async (storageKey) => {
        const url = await this.r2Service.createPresignedUrl(storageKey);
        urls[storageKey] = url;
      }),
    );

    return urls;
  }

  async deleteFiles(storageKeys: string[], schoolId: string): Promise<void> {
    for (const storageKey of storageKeys) {
      await this.r2Service.deleteObject(storageKey);
      await this.prisma.file.deleteMany({
        where: {
          storageKey,
          schoolId,
        },
      });
    }
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
        return `${BASE_STORAGE_KEY(schoolCode)}/logo/${fileId}.${extension}`;
      case FilePurpose.STUDENT_AVATAR:
        return `${BASE_STORAGE_KEY(schoolCode)}/students/avatars/${fileId}.${extension}`;
      case FilePurpose.BLOG_IMAGE:
        return `${BASE_STORAGE_KEY(schoolCode)}/blog/image/${fileId}.${extension}`;
      case FilePurpose.BLOG_THUMBNAIL:
        return `${BASE_STORAGE_KEY(schoolCode)}/blog/thumb/${fileId}.${extension}`;
      case FilePurpose.NOTIFICATION_THUMBNAIL:
        return `${BASE_STORAGE_KEY(schoolCode)}/notification/thumb/${fileId}.${extension}`;
      case FilePurpose.NOTIFICATION_IMAGE:
        return `${BASE_STORAGE_KEY(schoolCode)}/notification/image/${fileId}.${extension}`;
      default:
        return `${BASE_STORAGE_KEY(schoolCode)}/other/${fileId}.${extension}`;
    }
  }

  private buildTempStorageKey(
    schoolCode: string,
    fileId: string,
    extension: string,
    purpose: FilePurpose,
  ) {
    switch (purpose) {
      case FilePurpose.BLOG_IMAGE:
        return `${TEMP_BLOG_IMAGE_PREFIX(schoolCode, fileId)}.${extension}`;
      case FilePurpose.BLOG_THUMBNAIL:
        return `${TEMP_BLOG_THUMBNAIL_PREFIX(schoolCode, fileId)}.${extension}`;
      case FilePurpose.NOTIFICATION_THUMBNAIL:
        return `${TEMP_NOTIFICATION_THUMBNAIL_PREFIX(schoolCode, fileId)}.${extension}`;
      case FilePurpose.NOTIFICATION_IMAGE:
        return `${TEMP_NOTIFICATION_IMAGE_PREFIX(schoolCode, fileId)}.${extension}`;
      default:
        throw new AppException(
          'VALIDATION_ERROR',
          'Mục đích sử dụng không hợp lệ',
          HttpStatus.BAD_REQUEST,
        );
    }
  }
}
