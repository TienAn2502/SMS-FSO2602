import { usePushNotification } from '@/features/push-subscriptions';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface PushNotificationToggleProps {
    variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    showLabel?: boolean;
    className?: string;
}

export function PushNotificationToggle({
    variant = 'outline',
    size = 'sm',
    showLabel = true,
    className,
}: PushNotificationToggleProps) {
    const {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe,
    } = usePushNotification();

    // Not supported
    if (!isSupported) {
        return null;
    }

    // Permission denied
    if (permission === 'denied') {
        return (
            <Tooltip>
                <TooltipTrigger>
                    <Button
                        variant='ghost'
                        size='icon'
                        disabled
                        className={className}
                    >
                        <BellOff className='h-4 w-4' />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    Thông báo bị chặn. Bật trong Settings của trình duyệt.
                </TooltipContent>
            </Tooltip>
        );
    }

    // Default/unsubscribed state
    if (!isSubscribed) {
        return (
            <Tooltip>
                <TooltipTrigger>
                    <Button
                        variant={variant}
                        size={size}
                        onClick={subscribe}
                        disabled={isLoading}
                        className={className}
                    >
                        {isLoading ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                        ) : showLabel ? (
                            <>
                                <Bell className='h-4 w-4' />
                                <span className='ml-2'>Bật thông báo</span>
                            </>
                        ) : (
                            <Bell className='h-4 w-4' />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    Nhận thông báo khi có cập nhật mới
                </TooltipContent>
            </Tooltip>
        );
    }

    // Subscribed state
    return (
        <Tooltip>
            <TooltipTrigger>
                <Button
                    variant={variant}
                    size={size}
                    onClick={unsubscribe}
                    disabled={isLoading}
                    className={className}
                >
                    {isLoading ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                    ) : showLabel ? (
                        <>
                            <BellRing className='h-4 w-4' />
                            <span className='ml-2'>Tắt thông báo</span>
                        </>
                    ) : (
                        <BellRing className='h-4 w-4' />
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                {isSubscribed ? 'Tắt thông báo đẩy' : 'Bật thông báo đẩy'}
            </TooltipContent>
        </Tooltip>
    );
}

// Icon components
function Bell({ className }: { className?: string }) {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className={className}
        >
            <path d='M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' />
            <path d='M10.3 21a1.94 1.94 0 0 0 3.4 0' />
        </svg>
    );
}

function BellRing({ className }: { className?: string }) {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className={className}
        >
            <path d='M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' />
            <path d='M10.3 21a1.94 1.94 0 0 0 3.4 0' />
            <path d='M21 12h-1' />
            <path d='M4 12H3' />
            <path d='M12 4V3' />
            <path d='M12 21v-1' />
        </svg>
    );
}

function BellOff({ className }: { className?: string }) {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className={className}
        >
            <path d='M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5' />
            <path d='M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7' />
            <path d='M10.3 21a1.94 1.94 0 0 0 3.4 0' />
            <path d='M22 2 2 22' />
        </svg>
    );
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className={className}
        >
            <path d='M21 12a9 9 0 1 1-6.219-8.56' />
        </svg>
    );
}
