import { useAuth } from '@/features/auth/hooks/use-auth';
import type { NotificationRoomInput } from '@/features/notifications/api/notification-api';

/**
 * Hook for notifications Bell - returns user's rooms for filtering
 */
export function useUserNotificationRooms(): NotificationRoomInput[] {
    const { socketInfo } = useAuth();

    return (
        socketInfo?.notificationRooms.map((room) => {
            const [type, targetId] = room.room.split(':');
            return {
                roomType: type,
                targetId: targetId || '',
            };
        }) ?? []
    );
}

/**
 * Hook for notification list page - returns only SCHOOL room (toàn trường)
 */
export function useSchoolNotificationRoom(): NotificationRoomInput[] {
    return [{ roomType: 'SCHOOL', targetId: '' }];
}
