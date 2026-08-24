import { useState, useEffect, useCallback } from 'react';

import {
    createPushSubscription,
    unsubscribePushSubscription,
    type CreatePushSubscriptionInput,
} from '@/features/push-subscriptions/api/push-subscription-api';
import {
    urlBase64ToUint8Array,
    isPushSupported,
    getNotificationPermission,
} from '@/features/push-subscriptions/lib/push-notification-utils';

type NotificationPermissionState = 'granted' | 'denied' | 'default';

export interface UsePushNotificationReturn {
    isSupported: boolean;
    permission: NotificationPermissionState;
    isSubscribed: boolean;
    isLoading: boolean;
    error: string | null;
    subscribe: () => Promise<boolean>;
    unsubscribe: () => Promise<boolean>;
    refreshSubscriptionStatus: () => Promise<void>;
}

export function usePushNotification(): UsePushNotificationReturn {
    const [permission, setPermission] =
        useState<NotificationPermissionState>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSupported = isPushSupported();

    const refreshSubscriptionStatus = useCallback(async () => {
        if (!isSupported) return;

        setPermission(getNotificationPermission());

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription =
                await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch {
            setIsSubscribed(false);
        }
    }, [isSupported]);

    useEffect(() => {
        refreshSubscriptionStatus();
    }, [refreshSubscriptionStatus]);

    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            setError('Trình duyệt không hỗ trợ push notification');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log('requestPermission');
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') {
                setPermission(perm as NotificationPermissionState);
                setError('Người dùng từ chối quyền thông báo');
                return false;
            }
            setPermission('granted');

            const registration = await navigator.serviceWorker.ready;

            let subscription = await registration.pushManager.getSubscription();
            console.log('subscription', subscription);
            if (!subscription) {
                const vapidPublicKey =
                    import.meta.env.VITE_VAPID_PUBLIC_KEY ??
                    'BE4T8EaZNUvAY5fWdvqEDOBG5xT8kBB9y6LhkviYpUUJNDLjyWQQ_ZtDwPA0N_uYZQvZuAordIn5Dh7BtfFJ4g0';

                if (!vapidPublicKey) {
                    setError('VAPID public key không được cấu hình');
                    return false;
                }

                try {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey:
                            urlBase64ToUint8Array(vapidPublicKey),
                    });
                    console.log('subscription after subscribe:', subscription);
                } catch (subscribeErr) {
                    console.error('subscribe() error:', subscribeErr);
                    setError(`Lỗi subscribe: ${subscribeErr}`);
                    return false;
                }
                console.log('subscription', subscription);
            }

            // console.log('subscription', subscription);

            const subJSON = subscription.toJSON();

            if (
                !subJSON.endpoint ||
                !subJSON.keys?.p256dh ||
                !subJSON.keys?.auth
            ) {
                setError('Dữ liệu subscription không hợp lệ');
                return false;
            }

            const input: CreatePushSubscriptionInput = {
                endpoint: subJSON.endpoint,
                keys: {
                    p256dh: subJSON.keys.p256dh,
                    auth: subJSON.keys.auth,
                },
            };
            await createPushSubscription(input);
            setIsSubscribed(true);
            return true;
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Lỗi không xác định';
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported]);

    const unsubscribe = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription =
                await registration.pushManager.getSubscription();

            if (subscription) {
                const endpoint = subscription.endpoint;
                await subscription.unsubscribe();
                await unsubscribePushSubscription(endpoint);
            }

            setIsSubscribed(false);
            return true;
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Lỗi không xác định';
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        error,
        subscribe,
        unsubscribe,
        refreshSubscriptionStatus,
    };
}
