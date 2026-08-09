import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl as presignGetObjectUrl } from '@aws-sdk/s3-request-presigner';

import type { EnvConfig } from '@/common/config/env.schema';

@Injectable()
export class R2Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly signedUrlExpiresSec: number;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    const accountId = this.configService.get('R2_ACCOUNT_ID', { infer: true });
    const accessKeyId = this.configService.get('R2_ACCESS_KEY_ID', {
      infer: true,
    });
    const secretAccessKey = this.configService.get('R2_SECRET_ACCESS_KEY', {
      infer: true,
    });

    this.bucket = this.configService.get('R2_BUCKET', { infer: true });
    this.signedUrlExpiresSec = this.configService.get(
      'R2_SIGNED_URL_EXPIRES_SEC',
      { infer: true },
    );

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadObject(
    storageKey: string,
    body: Buffer,
    mimeType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: body,
        ContentType: mimeType,
      }),
    );
  }

  async createPresignedUrl(storageKey: string): Promise<string> {
    // Tạo command để lấy object từ R2
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    // Tạo URL để client tải/xem file
    return presignGetObjectUrl(this.client, command, {
      expiresIn: this.signedUrlExpiresSec,
    });
  }

  async deleteObject(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );
  }
}
