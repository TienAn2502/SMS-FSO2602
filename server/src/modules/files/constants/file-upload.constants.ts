import { FilePurpose } from '@prisma/client';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MIME_TO_EXTENSION: Record<AllowedImageMimeType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const EXTENSION_TO_MIME: Record<string, AllowedImageMimeType> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export const UPLOAD_PURPOSES: FilePurpose[] = [
  FilePurpose.SCHOOL_LOGO,
  FilePurpose.STUDENT_AVATAR,
  FilePurpose.BLOG_IMAGE,
  FilePurpose.BLOG_THUMBNAIL,
  FilePurpose.NOTIFICATION_THUMBNAIL,
  FilePurpose.NOTIFICATION_IMAGE,
  FilePurpose.OTHER,
];

export const BASE_STORAGE_KEY = (schoolCode: string) => `schools/${schoolCode}`;

/** Prefix R2 lifecycle: temp/ — ví dụ temp/schools/{code}/blog/image/{id}.ext */
export const TEMP_BLOG_IMAGE_PREFIX = (schoolCode: string, fileId?: string) =>
  fileId
    ? `temp/schools/${schoolCode}/blog/image/${fileId}`
    : `temp/schools/${schoolCode}/blog/image`;

export const TEMP_BLOG_THUMBNAIL_PREFIX = (
  schoolCode: string,
  fileId?: string,
) =>
  fileId
    ? `temp/schools/${schoolCode}/blog/thumbnail/${fileId}`
    : `temp/schools/${schoolCode}/blog/thumbnail`;

export const TEMP_NOTIFICATION_THUMBNAIL_PREFIX = (
  schoolCode: string,
  fileId?: string,
) =>
  fileId
    ? `temp/schools/${schoolCode}/notification/thumbnail/${fileId}`
    : `temp/schools/${schoolCode}/notification/thumbnail`;

export const TEMP_NOTIFICATION_IMAGE_PREFIX = (
  schoolCode: string,
  fileId?: string,
) =>
  fileId
    ? `temp/schools/${schoolCode}/notification/image/${fileId}`
    : `temp/schools/${schoolCode}/notification/image`;

export const TEMP_OTHER_PREFIX = (schoolCode: string, fileId?: string) =>
  fileId
    ? `temp/schools/${schoolCode}/other/${fileId}`
    : `temp/schools/${schoolCode}/other`;

export const TEMP_PREFIX_BY_PURPOSE: Record<
  Exclude<FilePurpose, 'SCHOOL_LOGO' | 'STUDENT_AVATAR'>,
  (schoolCode: string, fileId: string) => string
> = {
  BLOG_IMAGE: TEMP_BLOG_IMAGE_PREFIX,
  BLOG_THUMBNAIL: TEMP_BLOG_THUMBNAIL_PREFIX,
  NOTIFICATION_THUMBNAIL: TEMP_NOTIFICATION_THUMBNAIL_PREFIX,
  NOTIFICATION_IMAGE: TEMP_NOTIFICATION_IMAGE_PREFIX,
  OTHER: TEMP_OTHER_PREFIX,
};
