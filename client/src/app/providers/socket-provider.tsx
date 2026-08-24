import { useMemo, type ReactNode } from 'react';

import { getSocket } from '@/lib/socket';

import { SocketContext } from './socket-context';

export function SocketProvider({ children }: { children: ReactNode }) {
    const value = useMemo(
        () => ({
            getSocket,
        }),
        [],
    );

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}
