import { useSocket } from '@/app/providers/use-socket';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useEffect, useMemo, useState } from 'react';
import type { NotificationRoom } from '@/features/auth/types';

export function useNamespaceSocket(
    namespace: string,
    socketRooms: NotificationRoom[],
) {
    const { getSocket } = useSocket();
    const { isAuthenticated } = useAuth();

    const roomIds = useMemo(
        () => socketRooms.map((r) => r.room),
        [socketRooms],
    );

    const socket = useMemo(() => {
        return isAuthenticated ? getSocket(namespace, roomIds) : null;
    }, [getSocket, namespace, roomIds, isAuthenticated]);

    const [isConnected, setIsConnected] = useState(
        socket ? socket?.connected : false,
    );

    useEffect(() => {
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        socket?.on('connect', onConnect);
        socket?.on('disconnect', onDisconnect);

        if (!socket?.connected) {
            socket?.connect();
        }

        return () => {
            socket?.off('connect', onConnect);
            socket?.off('disconnect', onDisconnect);
        };
    }, [socket]);

    return {
        socket,
        isConnected,
    };
}
