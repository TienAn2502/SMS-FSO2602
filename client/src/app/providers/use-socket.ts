import { useContext } from 'react';

import { SocketContext } from './socket-context';

export function useSocket() {
    const context = useContext(SocketContext);

    if (!context) {
        throw new Error('useSocket phải dùng trong SocketProvider');
    }

    return context;
}
