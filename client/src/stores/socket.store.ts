import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationRoom {
  room: string;
  display: string;
}

export interface StudentSocketInfo {
  notificationRooms: NotificationRoom[];
}

export interface ParentSocketInfo {
  notificationRooms: NotificationRoom[];
}

export interface TeacherSocketInfo {
  notificationRooms: NotificationRoom[];
}

export interface SchoolAdminSocketInfo {
  notificationRooms: NotificationRoom[];
}

export type UserSocketInfo =
  | StudentSocketInfo
  | ParentSocketInfo
  | TeacherSocketInfo
  | SchoolAdminSocketInfo;

interface SocketStore {
  socketInfo: UserSocketInfo | null;
  isConnected: boolean;
  setSocketInfo: (info: UserSocketInfo | null) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useSocketStore = create<SocketStore>()(
  persist(
    (set) => ({
      socketInfo: null,
      isConnected: false,
      setSocketInfo: (info) => set({ socketInfo: info }),
      setConnected: (connected) => set({ isConnected: connected }),
      reset: () => set({ socketInfo: null, isConnected: false }),
    }),
    {
      name: 'socket-storage',
      partialize: (state) => ({ socketInfo: state.socketInfo }),
    }
  )
);
