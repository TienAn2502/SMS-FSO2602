import { useEffect, type ReactNode } from 'react';

import { PushNotificationContext } from '@/features/push-subscriptions/context/push-notification-context';
import { usePushNotification } from '@/features/push-subscriptions/hooks/use-push-notification';

interface PushNotificationProviderProps {
    children: ReactNode;
}

export function PushNotificationProvider({
    children,
}: PushNotificationProviderProps) {
    const pushNotification = usePushNotification();

    // Register service worker when component mounts
    useEffect(() => {
        if (!pushNotification.isSupported) return;

        // đăng ký service worker nếu chưa đăng ký
        navigator.serviceWorker
            .getRegistration('/sw.js')
            .then((registration) => {
                if (!registration) {
                    navigator.serviceWorker.register('/sw.js').catch((err) => {
                        console.error(
                            '[PushNotificationProvider] SW registration failed:',
                            err,
                        );
                    });
                }
            });
    }, [pushNotification.isSupported]);

    return (
        <PushNotificationContext.Provider value={pushNotification}>
            {children}
        </PushNotificationContext.Provider>
    );
}
