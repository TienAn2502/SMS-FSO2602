import type { TiptapContent } from '@/features/blogs/types';
import { api } from '@/lib/api';
import type { ApiSuccessResponse } from '@/types/api.types';

export type NotificationRoomType = 'SCHOOL' | 'HOMEROOM' | 'GRADE' | 'COURSE';

export interface NotificationRoom {
    id: string;
    label: string;
    type: string;
    members: number;
}

export interface NotificationRoomResponse {
    roomType: NotificationRoomType;
    targetId: string | null;
}

export interface Notification {
    id: string;
    schoolId?: string;
    title: string;
    slug: string;
    content: TiptapContent | null;
    contentHtml: string;
    thumbnailUrl: string | null;
    thumbnailStorageKey: string | null;
    rooms: NotificationRoomResponse[];
    createdById: string | null;
    createdByName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface RoomInput {
    roomType: NotificationRoomType;
    targetId?: string | null;
}

export interface CreateNotificationInput {
    title: string;
    content: TiptapContent;
    tempFiles: Array<{
        fileId: string;
        mimeType: string;
        sizeBytes: number;
        originalName: string;
    }>;
    thumbnailFileId?: string | null;
    thumbnailMimeType?: string | null;
    rooms: RoomInput[];
}

export interface UpdateNotificationInput {
    title?: string;
    content?: TiptapContent;
    tempFiles?: Array<{
        fileId: string;
        mimeType: string;
        sizeBytes: number;
        originalName: string;
    }>;
    thumbnailFileId?: string | null;
    thumbnailMimeType?: string | null;
    thumbnailNeedToDelete?: string | null;
    rooms?: RoomInput[];
    fileNeedToDelete?: (string | undefined)[];
}

export interface NotificationRoomInput {
    targetId: string;
    roomType: string;
}

export interface NotificationListParams {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'title';
    sortOrder?: 'asc' | 'desc';
    rooms?: NotificationRoomInput[];
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface NotificationListResponse {
    items: Notification[];
    meta: PaginationMeta;
}

export async function fetchNotifications(
    params?: NotificationListParams,
): Promise<NotificationListResponse> {
    const { data } = await api.get<
        ApiSuccessResponse<Notification[], PaginationMeta>
    >('/notifications', { params });
    return {
        items: data.data ?? [],
        meta: data.meta ?? {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
        },
    };
}

export async function fetchRoomNotifications(
    body: { roomType: string; targetId: string }[],
    params?: NotificationListParams,
) {
    const { data } = await api.post('/notifications/rooms', body, { params });
    console.log(data);

    return {
        items: data.data ?? [],
        unSeenNotifications: data.unSeenNotifications,
        meta: data.meta ?? {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
        },
    };
}

export async function fetchNotificationBySlug(
    slug: string,
): Promise<Notification> {
    const { data } = await api.get<ApiSuccessResponse<Notification>>(
        `/notifications/by-slug/${slug}`,
    );
    return data.data;
}

export async function fetchNotificationById(id: string): Promise<Notification> {
    const { data } = await api.get<ApiSuccessResponse<Notification>>(
        `/notifications/${id}`,
    );
    return data.data;
}

export async function fetchAvailableRooms(): Promise<NotificationRoom[]> {
    const response = await api.get<ApiSuccessResponse<NotificationRoom[]>>(
        '/notifications/rooms/available',
    );
    return response.data.data;
}

export async function createNotification(
    input: CreateNotificationInput,
): Promise<Notification> {
    const { data } = await api.post<ApiSuccessResponse<Notification>>(
        '/notifications',
        input,
    );
    return data.data;
}

export async function updateNotification(
    slug: string,
    input: UpdateNotificationInput,
): Promise<Notification> {
    const { data } = await api.patch<ApiSuccessResponse<Notification>>(
        `/notifications/${slug}`,
        input,
    );
    return data.data;
}

export async function deleteNotification(slug: string): Promise<void> {
    await api.delete(`/notifications/${slug}`);
}

export async function refreshNotificationUrls(
    storageKeys: string[],
): Promise<Record<string, string>> {
    const { data } = await api.post<ApiSuccessResponse<Record<string, string>>>(
        '/notifications/refresh-urls',
        { storageKeys },
    );
    return data.data;
}

// Legacy type for backward compatibility with existing socket info
export interface LegacyNotificationRoom {
    room: string;
    display: string;
}

export const getUserInRoom = async (room: string, userIds: string[]) => {
    const { data } = await api.post('/notifications/users/room', {
        room,
        userIds,
    });

    return data.data;
};

export const updateNotificationSeen = async () => {
    await api.patch('/notifications/seen', {});
};
export const readNotification = async (notificationId: string) => {
    await api.post(`/notifications/${notificationId}/read`);
};
