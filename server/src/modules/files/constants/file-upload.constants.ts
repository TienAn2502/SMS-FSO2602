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

export const UPLOAD_PURPOSES: FilePurpose[] = [
  FilePurpose.SCHOOL_LOGO,
  FilePurpose.STUDENT_AVATAR,
  FilePurpose.OTHER,
];
