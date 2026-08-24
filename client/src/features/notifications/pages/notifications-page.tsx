import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { PlusIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { ROUTES } from '@/app/router/routes';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchNotifications } from '@/features/notifications/api/notification-api';

export function NotificationsPage() {
    const { session } = useAuth();
    const navigate = useNavigate();
    const isSchoolAdmin = session?.user.role === 'SCHOOL_ADMIN';

    const listQuery = useQuery({
        queryKey: ['notifications'],
        queryFn: () => fetchNotifications({ page: 1, limit: 10 }),
    });

    const items = listQuery.data?.items ?? [];

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-2xl font-semibold'>Thông báo</h1>
                    <p className='text-sm text-muted-foreground'>
                        Xem các thông báo từ nhà trường
                    </p>
                </div>
                {isSchoolAdmin && (
                    <Button render={<Link to={ROUTES.notificationsNew} />}>
                        <PlusIcon className='mr-2 h-4 w-4' />
                        Tạo thông báo
                    </Button>
                )}
            </div>

            {listQuery.isLoading ? (
                <LoadingState message='Đang tải thông báo...' />
            ) : null}

            {!listQuery.isLoading && items.length === 0 ? (
                <EmptyState
                    title='Chưa có thông báo'
                    description='Hiện chưa có thông báo nào được công bố.'
                />
            ) : null}

            {items.length > 0 ? (
                <div className='flex flex-col gap-4'>
                    {items.map((notification) => (
                        <Card
                            key={notification.id}
                            className='cursor-pointer hover:bg-muted/50'
                            onClick={() => navigate(`${ROUTES.notifications}/${notification.slug}`)}
                        >
                            <CardHeader>
                                <div className='flex items-center gap-2'>
                                    <span
                                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                                            notification.type === 'INFO'
                                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                                : notification.type === 'SUCCESS'
                                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                  : notification.type === 'WARNING'
                                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                                    : 'bg-red-500/10 text-red-700 dark:text-red-400'
                                        }`}
                                    >
                                        {notification.type}
                                    </span>
                                    <span className='text-xs text-muted-foreground'>
                                        {new Date(notification.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                                <CardTitle className='text-lg'>{notification.title}</CardTitle>
                                <CardDescription
                                    dangerouslySetInnerHTML={{
                                        __html: notification.contentHtml.slice(0, 200) + '...',
                                    }}
                                />
                            </CardHeader>
                            <CardContent>
                                <p className='text-xs text-muted-foreground'>
                                    {notification.createdByName && `Đăng bởi: ${notification.createdByName}`}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
