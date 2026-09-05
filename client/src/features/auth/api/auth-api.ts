import { api } from '@/lib/api';
import type { ApiSuccessResponse } from '@/types/api.types';

import type { AuthSession, LoginInput } from '../types';
import { getFingerprint } from '@/lib/fingerprint';

export async function fetchMe(): Promise<AuthSession> {
    const { data } = await api.get<ApiSuccessResponse<AuthSession>>('/auth/me');
    return data.data;
}

export async function login(input: LoginInput): Promise<AuthSession> {
    const fp = await getFingerprint();
    const { visitorId } = await fp.get();
    const { data } = await api.post<ApiSuccessResponse<AuthSession>>(
        '/auth/login',
        { ...input, deviceId: visitorId },
    );
    return data.data;
}

export async function logout(): Promise<void> {
    await api.post('/auth/logout');
}

export async function changePassword(input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}): Promise<void> {
    await api.post('/auth/change-password', input);
}
