import { createContext } from 'react';
import type { Socket } from 'socket.io-client';

export interface SocketContextValue {
    getSocket: (
        namespace: string,
        socketInfo: string[],
    ) => Promise<Socket | null>;
}

export const SocketContext = createContext<SocketContextValue | null>(null);
