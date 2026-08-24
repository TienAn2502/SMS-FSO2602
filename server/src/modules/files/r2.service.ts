import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl as presignGetObjectUrl } from '@aws-sdk/s3-request-presigner';

import type { EnvConfig } from '@/common/config/env.schema';

export type R2ObjectMetadata = {
  contentType?: string;
  contentLength?: number;
};

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

  async listObjectsByPrefix(prefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });

    try {
      const response = await this.client.send(command);

      if (!response.Contents) {
        return [];
      }

      return response.Contents.map((object) => object.Key).filter(
        (key): key is string => Boolean(key),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Không thể quét danh sách file trên R2: ${message}`);
    }
  }

  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${sourceKey}`,
          Key: destinationKey,
        }),
      );
    } catch (error) {
      console.error('[R2] CopyObject error:', error);
      throw error;
    }

    await this.deleteObject(sourceKey);
  }

  async getObjectMetadata(storageKey: string): Promise<R2ObjectMetadata> {
    const response = await this.client.send(
      new HeadObjectCommand({
        // kiểm tra file tồn tại + lấy metadata
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );

    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
    };
  }

  async getObjectBuffer(storageKey: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );

    const body = response.Body;
    if (!body) {
      throw new Error(`R2 object empty: ${storageKey}`);
    }

    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }
}
