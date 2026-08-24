import { type ReactNode } from 'react';

import { NotificationSocketContext } from './notification-socket-context';
import { SOCKET_NAMESPACES } from '@/lib/socket';
import { useNamespaceSocket } from '@/hooks/use-socket.namespace';
import type { Socket } from 'socket.io-client';
import { useAuth } from '@/features/auth/hooks/use-auth';

export function NotificationSocketProvider({
    children,
}: {
    children: ReactNode;
}) {
    const { socketInfo } = useAuth();
    const notificationRooms = socketInfo?.notificationRooms ?? [];

    const { socket, isConnected } = useNamespaceSocket(
        SOCKET_NAMESPACES.notifications,
        notificationRooms,
    );

    return (
        <NotificationSocketContext.Provider
            value={{
                socket: socket as unknown as Socket,
                isConnected,
            }}
        >
            {children}
        </NotificationSocketContext.Provider>
    );
}
