// Re-export từ socket manager mới
export {
  socketManager,
  getSocket,
  getSocketSync,
  destroySocket,
  SOCKET_NAMESPACES,
} from './socket/index';

export type { SocketNamespace } from './socket/index';
