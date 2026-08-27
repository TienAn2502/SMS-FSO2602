import { Bell } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ROUTES } from '@/app/router/routes';
import {
    fetchRoomNotifications,
    type Notification,
} from '@/features/notifications/api/notification-api';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useNotificationSocket } from '@/features/notifications/context/use-notification-socket';
import { usePushNotification } from '@/features/push-subscriptions/hooks/use-push-notification';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useInView } from 'react-intersection-observer';

const TYPE_COLORS: Record<string, string> = {
    INFO: 'bg-blue-500',
    SUCCESS: 'bg-emerald-500',
    WARNING: 'bg-amber-500',
    ERROR: 'bg-red-500',
};

function formatRelativeTime(dateStr: string): string {
    return formatDistanceToNow(parseISO(dateStr), {
        addSuffix: true,
        locale: vi,
    });
}

// function resolveNotificationRoute(
//     event: any,
//     role: UserRole | undefined,
// ): string {
//     const eventType = event;
//     // Fallback khi role không xác định
//     if (!role) return ROUTES.portal;
//     switch (eventType) {
//         case 'GRADE_SAVED':
//             return resolveGradeSaved(targetType, targetId, studentId, role);
//     }
// }

export function NotificationBell() {
    const [realtimeBuffer, setRealtimeBuffer] = useState<Notification[]>([]);
    const [isNewNotification, setIsNewNotification] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(true);

    const prevCountRef = useRef(0);
    const { subscribe, isSubscribed } = usePushNotification();
    const { ref, inView } = useInView();

    const { socket: notificationSocket } = useNotificationSocket();
    const { socketInfo } = useAuth();

    const notificationRooms = useMemo(() => {
        return socketInfo?.notificationRooms.map((r) => {
            const [roomType, targetId] = r.room.split(':');

            return {
                roomType,
                targetId,
            };
        });
    }, [socketInfo]);

    // Handle realtime notifications
    useEffect(() => {
        const handleNotification = (data: Notification) => {
            setRealtimeBuffer((prev) => {
                // Avoid duplicates
                if (prev.some((n) => n.id === data.id)) return prev;

                return [data, ...prev];
            });

            setIsNewNotification(true);
            setIsLoadingMore(false);

            if (!isSubscribed) {
                subscribe();
            }

            setTimeout(() => setIsNewNotification(false), 2000);
        };

        notificationSocket?.on('notification', handleNotification);

        return () => {
            notificationSocket?.off('notification', handleNotification);
        };
    }, [notificationSocket, isSubscribed, subscribe]);

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useInfiniteQuery({
            queryKey: ['notifications', 'recent'],

            queryFn: ({ pageParam }) =>
                fetchRoomNotifications(
                    notificationRooms ??
                        ([] as { roomType: string; targetId: string }[]),
                    {
                        page: pageParam,
                        limit: 10,
                    },
                ),

            initialPageParam: 1,

            getNextPageParam: (lastPage) => {
                // Nếu items rỗng hoặc ít hơn limit (10) thì không còn trang tiếp theo
                if (!lastPage.items || lastPage.items.length < 10) {
                    return undefined;
                }

                // Số trang tiếp theo chính bằng tổng số trang đã fetch + 1
                return lastPage.meta.page + 1;
            },

            enabled: !!notificationRooms && notificationRooms.length > 0,

            refetchInterval: 60000,
        });

    // Load next page when reaching the bottom
    useEffect(() => {
        const handleFetchNextPage = async () => {
            if (inView && hasNextPage) {
                await fetchNextPage();
                setIsLoadingMore(true);
            }
        };
        handleFetchNextPage();
    }, [inView, hasNextPage, fetchNextPage, setIsLoadingMore]);

    // Gom tất cả notifications từ các pages
    const notifications = useMemo(() => {
        if (!data?.pages) return [];

        const allItems = data.pages.flatMap((page) => page.items);

        // Avoid duplicates
        const uniqueIds = new Set<string>();

        return allItems.filter((notification) => {
            if (uniqueIds.has(notification.id)) {
                return false;
            }

            uniqueIds.add(notification.id);
            return true;
        });
    }, [data]);

    // Gộp danh sách API với realtime buffer
    const allNotifications = useMemo(() => {
        const currentIds = new Set(notifications.map((n) => n.id));

        const uniqueRealtime = realtimeBuffer.filter(
            (n) => !currentIds.has(n.id),
        );

        // Tin realtime mới luôn nằm ở trên cùng
        return [...uniqueRealtime, ...notifications];
    }, [notifications, realtimeBuffer]);

    // Track badge count for animation
    useEffect(() => {
        if (notifications.length > prevCountRef.current) {
            setIsNewNotification(true);
            setTimeout(() => setIsNewNotification(false), 2000);
        }

        prevCountRef.current = notifications.length;
    }, [notifications.length]);

    const unreadCount = notifications.length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <Button variant='ghost' size='icon' className='relative'>
                    <Bell
                        className={cn(
                            'h-5 w-5',
                            isNewNotification &&
                                !isLoadingMore &&
                                'animate-bounce',
                        )}
                    />

                    {unreadCount > 0 && (
                        <span
                            className={cn(
                                'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white transition-transform',
                                isNewNotification &&
                                    !isLoadingMore &&
                                    'animate-ping',
                            )}
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}

                    <span className='sr-only'>Thông báo</span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align='end' className='w-80'>
                <div className='flex items-center justify-between border-b px-4 py-2'>
                    <span className='font-semibold'>Thông báo</span>

                    <span className='text-xs text-muted-foreground'>
                        {allNotifications.length} thông báo
                    </span>
                </div>

                <div className='max-h-100 overflow-y-auto'>
                    {isLoading ? (
                        <div className='flex items-center justify-center py-8'>
                            <span className='text-sm text-muted-foreground'>
                                Đang tải...
                            </span>
                        </div>
                    ) : allNotifications.length === 0 ? (
                        <div className='flex flex-col items-center justify-center py-8 text-center'>
                            <Bell className='mb-2 h-8 w-8 text-muted-foreground' />

                            <span className='text-sm text-muted-foreground'>
                                Chưa có thông báo nào
                            </span>
                        </div>
                    ) : (
                        <div className='py-1'>
                            {allNotifications.map((notification) => (
                                <Link
                                    key={notification.id}
                                    to={`${ROUTES.notifications}/${notification.slug}`}
                                    className='block px-4 py-3 hover:bg-muted/50'
                                >
                                    <div className='flex items-start gap-3'>
                                        <span
                                            className={cn(
                                                'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                                                TYPE_COLORS[
                                                    notification.type
                                                ] || 'bg-gray-500',
                                            )}
                                        />

                                        <div className='min-w-0 flex-1'>
                                            <p className='truncate text-sm'>
                                                {notification.title}
                                            </p>

                                            <p className='mt-0.5 truncate text-xs text-muted-foreground'>
                                                {notification.createdByName ||
                                                    'Ban Giám hiệu'}
                                            </p>

                                            <p className='mt-0.5 text-xs text-muted-foreground'>
                                                {formatRelativeTime(
                                                    notification.createdAt,
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}

                            <div ref={ref}>
                                {isFetchingNextPage && (
                                    <div className='flex items-center justify-center py-8'>
                                        <span className='text-sm text-muted-foreground'>
                                            Đang tải...
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className='border-t pt-2'>
                    <Link
                        to={ROUTES.notifications}
                        className='block px-4 py-2 text-center text-sm text-blue-600 hover:bg-muted/50 dark:text-blue-400'
                    >
                        Xem tất cả thông báo
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
