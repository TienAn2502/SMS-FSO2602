import { z } from 'zod';

import {
  paginationSchema,
  uuidParamSchema,
} from '@/common/schemas/shared.schema';

export const notificationTypeEnumSchema = z.enum([
  'INFO',
  'SUCCESS',
  'WARNING',
  'ERROR',
]);

export type NotificationTypeEnum = z.infer<typeof notificationTypeEnumSchema>;

export const notificationRoomTypeEnumSchema = z.enum([
  'SCHOOL',
  'HOMEROOM',
  'GRADE',
  'COURSE',
]);

export type NotificationRoomTypeEnum = z.infer<
  typeof notificationRoomTypeEnumSchema
>;

export const roomInputSchema = z.object({
  roomType: notificationRoomTypeEnumSchema,
  targetId: uuidParamSchema.optional().nullable(),
});

export type RoomInput = z.infer<typeof roomInputSchema>;

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

export const createNotificationSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(255),
  slug: z.string().min(1).max(500).optional(),
  content: tiptapContentSchema,
  thumbnailFileId: uuidParamSchema.optional().nullable(),
  thumbnailMimeType: z.string().optional().nullable(),
  tempFiles: z.array(tempFileItemSchema).default([]),
  rooms: z.array(roomInputSchema).min(1, 'Phải chọn ít nhất một phòng gửi'),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

export const updateNotificationSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(255).optional(),
  slug: z.string().min(1).max(500).optional(),
  content: tiptapContentSchema.optional(),
  thumbnailFileId: uuidParamSchema.optional().nullable(),
  thumbnailMimeType: z.string().optional().nullable(),
  thumbnailNeedToDelete: z.string().optional().nullable(),
  type: notificationTypeEnumSchema.optional(),
  tempFiles: z.array(tempFileItemSchema).default([]).optional(),
  rooms: z
    .array(roomInputSchema)
    .min(1, 'Phải chọn ít nhất một phòng gửi')
    .optional(),
  fileNeedToDelete: z.string().array().optional(),
});

export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;

export const listNotificationsQuerySchema = paginationSchema.extend({
  sortBy: z.enum(['createdAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  rooms: z
    .array(
      z.object({
        roomType: notificationRoomTypeEnumSchema,
        targetId: uuidParamSchema.nullable(),
      }),
    )
    .optional(),
});

export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;
