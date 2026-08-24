import { z } from 'zod';

import { uuidParamSchema } from '@/common/schemas/shared.schema';

export const blogStatusEnumSchema = z.enum(['DRAFT', 'PUBLISHED']);

export type BlogStatusEnum = z.infer<typeof blogStatusEnumSchema>;

export const listBlogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: blogStatusEnumSchema.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'publishedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListBlogsQuery = z.infer<typeof listBlogsQuerySchema>;

export const tempFileItemSchema = z.object({
  fileId: uuidParamSchema,
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  originalName: z.string().max(255),
});

// TiTip JSON content schema
const tiptapContentNodeSchema = z.object({
  type: z.string(),
  attrs: z.record(z.string(), z.unknown()).optional(),
  content: z.array(z.any()).optional(),
  marks: z
    .array(
      z.object({
        type: z.string(),
        attrs: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
  text: z.string().optional(),
});

export const tiptapContentSchema = z.object({
  type: z.literal('doc'),
  content: z.array(tiptapContentNodeSchema).optional(),
});

export const createBlogSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(500),
  content: tiptapContentSchema,
  status: blogStatusEnumSchema.default('DRAFT'),
  thumbnailFileId: uuidParamSchema.optional().nullable(),
  thumbnailMimeType: z.string().optional().nullable(),
  tempFiles: z.array(tempFileItemSchema).default([]),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDescription: z.string().optional().nullable(),
});

export type CreateBlogInput = z.infer<typeof createBlogSchema>;

export const updateBlogSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: tiptapContentSchema.optional(),
  status: blogStatusEnumSchema.optional(),
  thumbnailFileId: uuidParamSchema.optional().nullable(),
  thumbnailMimeType: z.string().optional().nullable(),
  tempFiles: z.array(tempFileItemSchema).default([]),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  fileNeedToDelete: z.string().array().optional(),
  thumbnailNeedToDelete: z.string().optional(),
});

export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;

export const blogParamSchema = z.string();
