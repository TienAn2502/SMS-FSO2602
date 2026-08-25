import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';

import { ROUTES } from '@/app/router/routes';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
    deleteNotification,
    fetchNotificationBySlug,
} from '@/features/notifications/api/notification-api';
import { useRefreshImageUrls } from '@/hooks/use-refresh-image-urls';
import { refreshNotificationUrls } from '@/features/notifications/api/notification-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { cn } from '@/lib/utils';
import { tiptapJsonToHtml } from '@/lib/tiptap-converter';

const NOTIFICATION_TYPE_COLORS: Record<string, string> = {
    INFO: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    SUCCESS: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    WARNING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    ERROR: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
    INFO: 'Thông tin',
    SUCCESS: 'Thành công',
    WARNING: 'Cảnh báo',
    ERROR: 'Lỗi',
};

export function NotificationDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const { session } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isSchoolAdmin = session?.user.role === 'SCHOOL_ADMIN';

    const detailQuery = useQuery({
        queryKey: ['notifications', 'slug', slug],
        queryFn: () => fetchNotificationBySlug(slug!),
        enabled: Boolean(slug),
    });

    const notification = detailQuery.data;
    const notificationContent = tiptapJsonToHtml(notification?.content ?? '');

    const deleteMutation = useMutation({
        mutationFn: (notificationSlug: string) =>
            deleteNotification(notificationSlug),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Đã xóa thông báo');
            void navigate(ROUTES.notifications);
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(
                getErrorMessage(
                    apiError?.code,
                    apiError?.message ?? 'Xóa thông báo thất bại',
                ),
            );
        },
    });

    // Refresh thumbnail URL
    const thumbnailKeys = notification?.thumbnailStorageKey
        ? [notification.thumbnailStorageKey]
        : [];
    const { urls: refreshedUrls, hasUrl } = useRefreshImageUrls(thumbnailKeys, {
        refreshFn: refreshNotificationUrls,
    });

    const thumbnailUrl =
        notification?.thumbnailStorageKey &&
        hasUrl(notification.thumbnailStorageKey)
            ? refreshedUrls.get(notification.thumbnailStorageKey)
            : notification?.thumbnailUrl;

    if (detailQuery.isLoading) {
        return <LoadingState message='Đang tải thông báo…' />;
    }

    if (!notification) {
        return (
            <div className='space-y-4'>
                <EmptyState
                    title='Không tìm thấy thông báo'
                    description='Thông báo không tồn tại hoặc đã bị xóa.'
                />
                <Button
                    variant='outline'
                    render={<Link to={ROUTES.notifications} />}
                >
                    Về danh sách
                </Button>
            </div>
        );
    }

    return (
        <div className='mx-auto max-w-5xl space-y-6'>
            <div className='flex items-center justify-between gap-3'>
                <Button
                    variant='outline'
                    size='sm'
                    render={<Link to={ROUTES.notifications} />}
                >
                    ← Danh sách
                </Button>
                <div className='flex items-center gap-3'>
                    {isSchoolAdmin && (
                        <Button
                            variant='default'
                            size='sm'
                            render={
                                <Link
                                    to={ROUTES.notificationsEdit.replace(
                                        ':slug',
                                        notification.slug,
                                    )}
                                />
                            }
                        >
                            Chỉnh sửa
                        </Button>
                    )}
                    {isSchoolAdmin && (
                        <AlertDialog>
                            <AlertDialogTrigger
                                render={
                                    <Button
                                        type='button'
                                        variant='destructive'
                                        size='sm'
                                        disabled={deleteMutation.isPending}
                                    />
                                }
                            >
                                <Trash2 className='mr-2 h-4 w-4' />
                                Xóa
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Xóa thông báo này?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Hành động này không thể hoàn tác. Thông báo
                                        sẽ bị xóa vĩnh viễn cùng các tệp đính kèm.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel
                                        variant='outline'
                                        disabled={deleteMutation.isPending}
                                    >
                                        Hủy
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        variant='destructive'
                                        disabled={deleteMutation.isPending}
                                        onClick={() =>
                                            deleteMutation.mutate(notification.slug)
                                        }
                                    >
                                        {deleteMutation.isPending
                                            ? 'Đang xóa…'
                                            : 'Xóa'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <span
                        className={cn(
                            'rounded-md px-1.5 py-0.5 text-xs font-medium',
                            NOTIFICATION_TYPE_COLORS[notification.type] || '',
                        )}
                    >
                        {NOTIFICATION_TYPE_LABELS[notification.type] ||
                            notification.type}
                    </span>
                </div>
            </div>

            <Card>
                {thumbnailUrl && (
                    <div className='aspect-video w-full overflow-hidden bg-muted'>
                        <img
                            src={thumbnailUrl}
                            alt={notification.title}
                            className='h-full w-full object-cover'
                        />
                    </div>
                )}
                <CardHeader className='gap-3'>
                    <CardTitle className='text-2xl leading-snug'>
                        {notification.title}
                    </CardTitle>
                    <div className='flex flex-col gap-1 text-sm text-muted-foreground'>
                        <div className='flex flex-wrap gap-x-3 gap-y-1'>
                            <span>
                                {notification.createdByName || 'Ban Giám hiệu'}
                            </span>
                            <span>
                                {format(
                                    parseISO(notification.createdAt),
                                    'dd/MM/yyyy HH:mm',
                                    {
                                        locale: vi,
                                    },
                                )}
                            </span>
                        </div>
                    </div>
                    {notification.rooms.length > 0 && (
                        <div className='flex flex-wrap gap-1'>
                            {notification.rooms.map((room, index) => (
                                <span
                                    key={index}
                                    className='rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                                >
                                    {room.roomType === 'SCHOOL' &&
                                        'Toàn trường'}
                                    {room.roomType === 'HOMEROOM' &&
                                        'Lớp chủ nhiệm'}
                                    {room.roomType === 'GRADE' && 'Khối lớp'}
                                    {room.roomType === 'COURSE' && 'Môn học'}
                                </span>
                            ))}
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <div
                        className='prose prose-sm max-w-none dark:prose-invert [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_ul]:list-disc [&_img]:rounded-lg'
                        dangerouslySetInnerHTML={{
                            __html: notificationContent,
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
