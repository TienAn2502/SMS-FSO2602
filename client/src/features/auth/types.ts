import type { UserRole } from '@/types/api.types';

export interface AuthUser {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    status: string;
    sessionId: string;
    deviceId: string;
}

export interface AuthSchool {
    id: string;
    code: string;
    name: string;
    shortName: string | null;
}

// ============================================================
// Socket Info Types
// ============================================================

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

export interface AuthSession {
    user: AuthUser;
    activeSchoolId: string | null;
    activeSchool: AuthSchool | null;
    impersonation: ImpersonationSession | null;
    socketInfo: UserSocketInfo | null;
}

export type ImpersonationMode = 'read_only' | 'full';

export interface ImpersonationSession {
    targetSchoolId: string;
    targetSchoolName: string;
    impersonatedBy: string;
    mode: ImpersonationMode;
    startedAt: string;
}

export interface LoginInput {
    identifier: string;
    password: string;
}
