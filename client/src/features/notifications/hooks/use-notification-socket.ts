import { useContext } from 'react';

import { NotificationSocketContext } from '../context/notification-socket-context';

export function useNotificationSocket() {
    const context = useContext(NotificationSocketContext);

    if (!context) {
        throw new Error(
            'useNotificationSocket phải dùng trong NotificationSocketProvider',
        );
    }

    return context;
}
