import type { PaginationMeta } from '@/common/types/api-response.types';

export interface PushSubscriptionResponse {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushSubscriptionListResponse {
  items: PushSubscriptionResponse[];
  meta: PaginationMeta;
}
