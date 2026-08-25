import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { DataPagination } from '@/components/common/data-pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchNotifications } from '@/features/notifications/api/notification-api';

const PAGE_SIZE = 10;

const NOTIFICATION_TYPE_BADGE: Record<string, string> = {
    INFO: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    SUCCESS: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    WARNING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    ERROR: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

export function NotificationsPage() {
    const { session } = useAuth();
    const navigate = useNavigate();
    const isSchoolAdmin = session?.user.role === 'SCHOOL_ADMIN';
    const [page, setPage] = useState(1);

    const listQuery = useQuery({
        queryKey: ['notifications', session?.activeSchoolId, page],
        queryFn: () => fetchNotifications({ page, limit: PAGE_SIZE }),
        enabled: Boolean(session?.activeSchoolId),
        placeholderData: keepPreviousData,
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

            {listQuery.isError ? (
                <ErrorState
                    message='Không tải được danh sách thông báo'
                    onRetry={() => void listQuery.refetch()}
                />
            ) : null}

            <div className='relative rounded-lg'>
                {listQuery.isFetching && !listQuery.isLoading ? (
                    <div className='absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]'>
                        <LoadingState message='Đang tải dữ liệu...' />
                    </div>
                ) : null}

                {listQuery.isLoading ? (
                    <LoadingState message='Đang tải thông báo...' />
                ) : items.length === 0 ? (
                    <EmptyState
                        title='Chưa có thông báo'
                        description='Hiện chưa có thông báo nào được công bố.'
                    />
                ) : (
                    <div className='flex flex-col gap-4'>
                        {items.map((notification) => {
                            const badgeClass =
                                NOTIFICATION_TYPE_BADGE[notification.type] ??
                                NOTIFICATION_TYPE_BADGE.INFO;

                            return (
                                <Card
                                    key={notification.id}
                                    className='cursor-pointer hover:bg-muted/50'
                                    onClick={() =>
                                        navigate(
                                            `${ROUTES.notifications}/${notification.slug}`,
                                        )
                                    }
                                >
                                    <CardHeader>
                                        <div className='flex items-center gap-2'>
                                            <span
                                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                                            >
                                                {notification.type}
                                            </span>
                                            <span className='text-xs text-muted-foreground'>
                                                {new Date(
                                                    notification.createdAt,
                                                ).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                        <CardTitle className='text-lg'>
                                            {notification.title}
                                        </CardTitle>
                                        <CardDescription
                                            dangerouslySetInnerHTML={{
                                                __html:
                                                    notification.contentHtml.slice(
                                                        0,
                                                        200,
                                                    ) + '...',
                                            }}
                                        />
                                    </CardHeader>
                                    <CardContent>
                                        <p className='text-xs text-muted-foreground'>
                                            {notification.createdByName &&
                                                `Đăng bởi: ${notification.createdByName}`}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {!listQuery.isLoading && items.length > 0 ? (
                <DataPagination
                    page={listQuery.data?.meta.page ?? page}
                    totalPages={listQuery.data?.meta.totalPages ?? 1}
                    onPageChange={setPage}
                />
            ) : null}
        </div>
    );
}
