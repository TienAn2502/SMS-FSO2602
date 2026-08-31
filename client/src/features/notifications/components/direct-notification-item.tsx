import { readNotification } from '@/features/notifications/api/notification-api';
import { formatRelativeTime } from '@/features/notifications/utils';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';

interface IProps {
    notification: any;
    url: string;
}

const DirectNotificationItem = (props: IProps) => {
    const { notification, url } = props;

    const queryClient = useQueryClient();
    const { mutate: handleReadNotification } = useMutation({
        mutationFn: readNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
    return (
        <Link
            key={notification.id}
            to={url}
            className='block px-4 py-3 hover:bg-muted/50'
            onClick={() => {
                if (!notification.isRead) {
                    handleReadNotification(notification.id);
                }
            }}
        >
            <div className='flex items-start gap-3'>
                <span
                    className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        !notification.isRead && 'bg-blue-500',
                    )}
                />

                <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm'>{notification.title}</p>

                    <p className='mt-0.5 truncate text-xs text-muted-foreground'>
                        {notification.createdByName || 'Ban Giám hiệu'}
                    </p>

                    <p className='mt-0.5 text-xs text-muted-foreground'>
                        {formatRelativeTime(notification.createdAt)}
                    </p>
                </div>
            </div>
        </Link>
    );
};
export default DirectNotificationItem;
