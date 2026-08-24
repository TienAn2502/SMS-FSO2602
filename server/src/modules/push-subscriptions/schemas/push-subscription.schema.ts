import { z } from 'zod';

import { paginationSchema } from '@/common/schemas/shared.schema';

// Keys schema for push subscription
export const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1, 'P256DH key là bắt buộc'),
  auth: z.string().min(1, 'Auth key là bắt buộc'),
});

export type PushSubscriptionKeys = z.infer<typeof pushSubscriptionKeysSchema>;

// Create push subscription input
export const createPushSubscriptionSchema = z.object({
  endpoint: z.string().url('Endpoint không hợp lệ'),
  keys: pushSubscriptionKeysSchema,
});

export type CreatePushSubscriptionInput = z.infer<
  typeof createPushSubscriptionSchema
>;

// List push subscriptions query
export const listPushSubscriptionsQuerySchema = paginationSchema.extend({
  sortBy: z.enum(['createdAt', 'endpoint']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListPushSubscriptionsQuery = z.infer<
  typeof listPushSubscriptionsQuerySchema
>;
