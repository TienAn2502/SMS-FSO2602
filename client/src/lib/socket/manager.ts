import { io, type Socket, type SocketOptions } from 'socket.io-client';

export interface NotificationRoom {
    room: string;
    display: string;
}

export const SOCKET_NAMESPACES = {
    notifications: '/notifications',
    chat: '/chat',
    // thêm namespace mới ở đây
} as const;

export type SocketNamespace = keyof typeof SOCKET_NAMESPACES;

function resolveSocketUrl(): string {
    const apiBase =
        import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';
    return apiBase.replace(/\/api\/v\d+\/?$/, '');
}

function getDefaultOptions(
    socketRooms: NotificationRoom[] = [],
): Partial<SocketOptions> {
    return {
        autoConnect: false,
        withCredentials: true,
        reconnectionAttempts: 0,
        transports: ['websocket'],
        auth: {
            rooms: socketRooms,
        },
    };
}

class SocketManager {
    private sockets = new Map<string, Socket>();

    private getNamespacePath(namespace: string): string {
        if (namespace === '/') return resolveSocketUrl();
        return `${resolveSocketUrl()}${namespace}`;
    }

    getSocket(namespace: string = '/', socketRooms: NotificationRoom[] = []) {
        if (this.sockets.has(namespace)) {
            return this.sockets.get(namespace)!;
        }

        // Tạo mới namespace
        const socket = io(
            this.getNamespacePath(namespace),
            getDefaultOptions(socketRooms),
        );
        this.sockets.set(namespace, socket);
        return socket;
    }

    getSocketSync(namespace: string = '/'): Socket | undefined {
        return this.sockets.get(namespace);
    }

    destroySocket(namespace?: string): void {
        if (namespace) {
            const socket = this.sockets.get(namespace);
            if (socket) {
                socket.removeAllListeners();
                socket.disconnect();
                this.sockets.delete(namespace);
            }
        } else {
            this.sockets.forEach((socket) => {
                socket.removeAllListeners();
                socket.disconnect();
            });
            this.sockets.clear();
        }
    }

    destroyAll(): void {
        this.destroySocket();
    }
}

export const socketManager = new SocketManager();

export function getSocket(
    namespace: SocketNamespace | string = '/',
    socketRooms: NotificationRoom[] = [],
): Promise<Socket | null> {
    const ns =
        namespace in SOCKET_NAMESPACES
            ? SOCKET_NAMESPACES[namespace as SocketNamespace]
            : namespace;
    return socketManager.getSocket(ns, socketRooms);
}

export function getSocketSync(
    namespace: SocketNamespace | string = '/',
): Socket | undefined {
    const ns =
        namespace in SOCKET_NAMESPACES
            ? SOCKET_NAMESPACES[namespace as SocketNamespace]
            : namespace;
    return socketManager.getSocketSync(ns);
}

export function destroySocket(namespace?: SocketNamespace | string): void {
    const ns = namespace
        ? namespace in SOCKET_NAMESPACES
            ? SOCKET_NAMESPACES[namespace as SocketNamespace]
            : namespace
        : undefined;
    socketManager.destroySocket(ns);
}
