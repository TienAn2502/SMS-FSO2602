import { RouterProvider } from 'react-router';

import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth/context/auth-provider';
import { NotificationSocketProvider } from '@/features/notifications/context/notification-socket-provider';

import { router } from '../router/router';
import { QueryProvider } from './query-provider';
import { SocketProvider } from './socket-provider';
import { PushNotificationProvider } from '@/features/push-subscriptions/context/push-notification-provider';

export function AppProviders() {
    return (
        <QueryProvider>
            <TooltipProvider>
                <AuthProvider>
                    <PushNotificationProvider>
                        <SocketProvider>
                            <NotificationSocketProvider>
                                <RouterProvider router={router} />
                            </NotificationSocketProvider>
                        </SocketProvider>
                    </PushNotificationProvider>
                </AuthProvider>
            </TooltipProvider>
        </QueryProvider>
    );
}
