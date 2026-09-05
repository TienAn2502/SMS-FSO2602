import { Bell } from 'lucide-react';
import {
    useInfiniteQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import { Link } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import React from 'react';
import { ROUTES } from '@/app/router/routes';
import {
    fetchRoomNotifications,
    updateNotificationSeen,
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
import DirectNotificationItem from '@/features/notifications/components/direct-notification-item';
import NotificationWithChildSelector from '@/features/notifications/components/notification-with-child-selector';
import useMyChildren from '@/features/notifications/hooks/use-my-children';

function resolveNotificationRoute(
    role: string,
    notification: any,
    students: any[],
    setIsDropDownOpen: React.Dispatch<React.SetStateAction<boolean>>,
) {
    switch (notification.type) {
        case 'ANNOUNCEMENT':
            return (
                <DirectNotificationItem
                    notification={notification}
                    url={`${ROUTES.notifications}/${notification.slug}`}
                />
            );
        case 'GRADE_LOCKED':
        case 'GRADE_SAVED':
            return resolveGradeSaved(
                role,
                notification,
                students,
                setIsDropDownOpen,
            );

        case 'ACADEMIC_YEAR_LOCKED':
        case 'SEMESTER_LOCKED':
            return resolveSemesterLocked(
                role,
                notification,
                students,
                setIsDropDownOpen,
            );

        case 'ATTENDANCE_LOCKED':
            return resolveAttendanceLocked(
                role,
                notification,
                students,
                setIsDropDownOpen,
            );
    }
}

function resolveGradeSaved(
    userRole: any,
    notification: any,
    students: any[],
    setIsDropDownOpen: React.Dispatch<React.SetStateAction<boolean>>,
) {
    switch (userRole) {
        case 'STUDENT':
            return (
                <DirectNotificationItem
                    notification={notification}
                    url={'/portal/my-scores'}
                />
            );
        case 'PARENT':
            return (
                <NotificationWithChildSelector
                    suffix='scores'
                    notification={notification}
                    students={students}
                    setIsDropDownOpen={setIsDropDownOpen}
                />
            );
        case 'SCHOOL_ADMIN':
            return (
                <DirectNotificationItem
                    notification={notification}
                    url={`/assessments/sections/${notification.rooms[0].targetId}`}
                />
            );
    }
}
function resolveSemesterLocked(
    userRole: any,
    notification: any,
    students: any[],
    setIsDropDownOpen: React.Dispatch<React.SetStateAction<boolean>>,
) {
    switch (userRole) {
        case 'STUDENT':
            return (
                <DirectNotificationItem
                    notification={notification}
                    url={'/grade-summaries'}
                />
            );
        case 'PARENT':
            return (
                <NotificationWithChildSelector
                    suffix='summaries'
                    notification={notification}
                    students={students}
                    setIsDropDownOpen={setIsDropDownOpen}
                />
            );
        case 'SCHOOL_ADMIN':
            return (
                <DirectNotificationItem
                    notification={notification}
                    url={'/grade-summaries'}
                />
            );
    }
}

function resolveAttendanceLocked(
    userRole: any,
    notification: any,
    students: any[],
    setIsDropDownOpen: React.Dispatch<React.SetStateAction<boolean>>,
) {
    switch (userRole) {
        case 'STUDENT':
            return (
                <DirectNotificationItem
                    notification={notification}
                    url={'/portal/my-attendance'}
                />
            );
        case 'PARENT':
            return (
                <NotificationWithChildSelector
                    suffix='attendance'
                    notification={notification}
                    students={students}
                    setIsDropDownOpen={setIsDropDownOpen}
                />
            );
        case 'SCHOOL_ADMIN':
            return (
                <DirectNotificationItem
                    notification={notification}
                    url={`/attendance-sessions/${notification.metadata.attendanceId}`}
                />
            );
    }
}

export function NotificationBell() {
    const [realtimeBuffer, setRealtimeBuffer] = useState<Notification[]>([]);
    const [isNewNotification, setIsNewNotification] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(true);
    const [isDropDownOpen, setIsDropDownOpen] = useState<boolean>(false);
    const [unSeenCount, setUnSeenCount] = useState<number>(0);
    const { subscribe, isSubscribed } = usePushNotification();
    const { ref, inView } = useInView();
    const queryClient = useQueryClient();

    const { socket: notificationSocket } = useNotificationSocket();
    const { socketInfo, session } = useAuth();

    const { children } = useMyChildren();

    const notificationRooms = useMemo(() => {
        return socketInfo?.notificationRooms.map((r) => {
            const [roomType, targetId] = r.room.split(':');

            return {
                roomType,
                targetId,
            };
        });
    }, [socketInfo]);

    const { mutate: handleUpdateNotificationSeen } = useMutation({
        mutationFn: updateNotificationSeen,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

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
            select(data) {
                return {
                    pages: data.pages, // Giữ nguyên các trang chứa items và meta
                    pageParams: data.pageParams,
                    unSeenNotifications:
                        data.pages[0]?.unSeenNotifications ?? 0, // Đưa ra ngoài ngang hàng
                };
            },

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

    useEffect(() => {
        const handleRenderUnSeenCount = () => {
            if (data && typeof data.unSeenNotifications === 'number') {
                setUnSeenCount(data.unSeenNotifications);
            }
        };

        handleRenderUnSeenCount();
    }, [data]);

    return (
        <DropdownMenu open={isDropDownOpen} onOpenChange={setIsDropDownOpen}>
            <DropdownMenuTrigger>
                <Button
                    onClick={() => handleUpdateNotificationSeen()}
                    variant='ghost'
                    size='icon'
                    className='relative'
                >
                    <Bell
                        className={cn(
                            'h-5 w-5',
                            isNewNotification &&
                                !isLoadingMore &&
                                'animate-bounce',
                        )}
                    />
                    {unSeenCount > 0 && (
                        <span
                            className={cn(
                                'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white transition-transform',
                                isNewNotification &&
                                    !isLoadingMore &&
                                    'animate-ping',
                            )}
                        >
                            {unSeenCount > 9 ? '9+' : String(unSeenCount)}
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
                                <React.Fragment key={notification.id}>
                                    {resolveNotificationRoute(
                                        session!.user.role,
                                        notification,
                                        children,
                                        setIsDropDownOpen,
                                    )}
                                </React.Fragment>
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
