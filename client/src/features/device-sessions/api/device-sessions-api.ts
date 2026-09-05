import { api } from '@/lib/api';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface DeviceSessionItem {
    id: string; // sessionId
    userId: string;
    deviceId: string;
    os: string;
    browser: string;
    deviceType: string | null;
    deviceVendor: string | null;
    deviceModel: string | null;
    ipAddress: string;
    createdAt: string;
    updatedAt: string;
    expiredAt: string;
}

export interface DeviceSessionsResponse {
    devices: DeviceSessionItem[];
    totalCount: number;
}

export interface DeleteDeviceSessionResponse {
    success: boolean;
    message: string;
}

export async function fetchDeviceSessions(
    userId: string,
): Promise<DeviceSessionsResponse> {
    const { data } = await api.get<ApiSuccessResponse<DeviceSessionsResponse>>(
        `/device-session/${userId}`,
    );
    return data.data;
}

export async function deleteOneDeviceSession(
    sessionId: string,
): Promise<DeleteDeviceSessionResponse> {
    const { data } = await api.delete<DeleteDeviceSessionResponse>(
        `/device-session/${sessionId}`,
    );
    return data;
}

export async function deleteAllDeviceSessions(
    sessionIdKeys: string[],
): Promise<DeleteDeviceSessionResponse> {
    const { data } = await api.delete<DeleteDeviceSessionResponse>(
        '/device-session/all',
        {
            data: {
                sessionIdKeys,
            },
        },
    );
    return data;
}
