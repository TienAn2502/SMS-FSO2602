import type { Notification, NotificationRoom, User } from '@prisma/client';

// TiTip JSON content type
export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

export type TiptapContent = {
  type: 'doc';
  content?: TiptapNode[];
} | null;

export interface NotificationResponse {
  id: string;
  schoolId: string;
  title: string;
  slug: string;
  content: TiptapContent | null;
  contentHtml: string;
  thumbnailUrl: string | null;
  thumbnailStorageKey: string | null;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  rooms: NotificationRoomResponse[];
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRoomResponse {
  roomType: 'SCHOOL' | 'HOMEROOM' | 'GRADE' | 'COURSE';
  targetId: string | null;
  targetLabel?: string;
}

export const notificationInclude = {
  createdBy: {
    select: {
      id: true,
      fullName: true,
    },
  },

  rooms: true,
};
