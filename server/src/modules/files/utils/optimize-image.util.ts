import { FilePurpose } from '@prisma/client';
import sharp from 'sharp';

export type OptimizedImage = {
  buffer: Buffer;
  mimeType: 'image/webp';
  extension: 'webp';
  sizeBytes: number;
};

const IMAGE_OPTIMIZE_PRESETS: Record<
  FilePurpose,
  { maxWidth: number; quality: number }
> = {
  [FilePurpose.SCHOOL_LOGO]: { maxWidth: 512, quality: 82 },
  [FilePurpose.STUDENT_AVATAR]: { maxWidth: 512, quality: 82 },
  [FilePurpose.BLOG_IMAGE]: { maxWidth: 1920, quality: 80 },
  [FilePurpose.BLOG_THUMBNAIL]: { maxWidth: 800, quality: 75 },
  [FilePurpose.NOTIFICATION_THUMBNAIL]: { maxWidth: 800, quality: 75 },
  [FilePurpose.NOTIFICATION_IMAGE]: { maxWidth: 1920, quality: 80 },
  [FilePurpose.OTHER]: { maxWidth: 1920, quality: 80 },
};

/**
 * Resize + convert WebP trước khi lưu R2/DB.
 * GIF động chỉ giữ frame đầu (đủ cho logo/blog).
 */
export async function optimizeImageBuffer(
  input: Buffer,
  purpose: FilePurpose,
): Promise<OptimizedImage> {
  const preset = IMAGE_OPTIMIZE_PRESETS[purpose];

  const buffer = await sharp(input, { failOn: 'none' })
    .rotate() // tôn trọng EXIF orientation
    .resize({
      width: preset.maxWidth,
      height: preset.maxWidth,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: preset.quality, effort: 4 })
    .toBuffer();

  return {
    buffer,
    mimeType: 'image/webp',
    extension: 'webp',
    sizeBytes: buffer.byteLength,
  };
}
