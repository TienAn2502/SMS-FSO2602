import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export const uuidParamSchema = z.string().uuid('ID không hợp lệ');

export const filePurposeEnumSchema = z.enum([
  'SCHOOL_LOGO',
  'STUDENT_AVATAR',
  'BLOG_IMAGE',
  'BLOG_THUMBNAIL',
  'NOTIFICATION_THUMBNAIL',
  'NOTIFICATION_IMAGE',
  'OTHER',
]);

export type FilePurposeEnum = z.infer<typeof filePurposeEnumSchema>;

export const batchPromoteItemSchema = z.object({
    purpose: filePurposeEnumSchema,
    fileId: uuidParamSchema,
    mimeType: z.string().max(100),
    sizeBytes: z.number().int().positive(),
    originalName: z.string().max(255),
});

export const batchPromoteSchema = z.object({
  files: z.array(batchPromoteItemSchema),
});

export type BatchPromoteRequest = z.infer<typeof batchPromoteSchema>;
