import { createContext } from 'react';
import type { Socket } from 'socket.io-client';
import type { Notification } from '@/features/notifications/api/notification-api';

export interface NotificationSocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
}

export const NotificationSocketContext =
    createContext<NotificationSocketContextValue | null>(null);
