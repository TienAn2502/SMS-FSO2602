import { createContext } from 'react';

import type { UsePushNotificationReturn } from '@/features/push-subscriptions/hooks/use-push-notification';

export type PushNotificationContextValue = UsePushNotificationReturn;

export const PushNotificationContext =
    createContext<PushNotificationContextValue | null>(null);
