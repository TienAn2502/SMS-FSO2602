import { api } from '@/lib/api';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface PushSubscriptionKeysJson {
    p256dh: string;
    auth: string;
}

export interface PushSubscriptionPayload {
    endpoint: string;
    keys: PushSubscriptionKeysJson;
}

export interface PushSubscription {
    id: string;
    endpoint: string;
    userAgent: string | null;
    createdAt: string;
}

export interface CreatePushSubscriptionInput {
    endpoint: string;
    keys: PushSubscriptionKeysJson;
}

export async function registerPushSubscription(
    payload: PushSubscriptionPayload,
): Promise<PushSubscription> {
    const { data } = await api.post<ApiSuccessResponse<PushSubscription>>(
        '/push-subscriptions',
        payload,
    );
    return data.data;
}

export async function unregisterPushSubscription(
    endpoint: string,
): Promise<void> {
    await api.delete('/push-subscriptions/endpoint', { data: { endpoint } });
}

export async function listPushSubscriptions(): Promise<PushSubscription[]> {
    const { data } = await api.get<ApiSuccessResponse<PushSubscription[]>>(
        '/push-subscriptions',
    );
    return data.data;
}

export async function createPushSubscription(
    input: CreatePushSubscriptionInput,
): Promise<PushSubscription> {
    const { data } = await api.post<ApiSuccessResponse<PushSubscription>>(
        '/push-subscriptions',
        input,
    );
    return data.data;
}

export async function unsubscribePushSubscription(
    endpoint: string,
): Promise<void> {
    await api.delete('/push-subscriptions/endpoint', { data: { endpoint } });
}
