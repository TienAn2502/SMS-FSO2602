
import { Button } from '@/components/ui/button';
// import {
//     Card,
//     CardContent,
//     CardDescription,
//     CardHeader,
//     CardTitle,
// } from '@/components/ui/card';
// import {
//     AlertDialog,
//     AlertDialogAction,
//     AlertDialogCancel,
//     AlertDialogContent,
//     AlertDialogDescription,
//     AlertDialogFooter,
//     AlertDialogHeader,
//     AlertDialogTitle,
// } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/tiptap-ui-primitive/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import type { DeviceSession } from '@/features/device-sessions/api/device-sessions-api';

interface DeviceSessionsTableProps {
    data: DeviceSession[];
    isLoading: boolean;
    isFetching: boolean;
    onDeleteSession: (sessionId: string) => void;
    isDeletePending: boolean;
    onRefresh: () => void;
    currentSessionId?: string;
}

export function DeviceSessionsTable({
    data,
    isLoading,
    isFetching,
    onDeleteSession,
    isDeletePending,
    // onRefresh,
    currentSessionId,
}: DeviceSessionsTableProps) {
    if (isLoading) {
        return (
            <div className='space-y-4'>
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className='flex items-center gap-4'>
                        <Skeleton className='h-12 w-12 rounded-full' />
                        <div className='space-y-2'>
                            <Skeleton className='h-4 w-62.5' />
                            <Skeleton className='h-4 w-50' />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    console.log('data', data);

    if (data.length === 0) {
        return (
            <EmptyState
                title='Chưa có thiết bị nào'
                description='Đăng nhập từ thiết bị mới để xem danh sách tại đây'
            />
        );
    }

    return (
        <div className='relative'>
            {isFetching && !isLoading && (
                <div className='pointer-events-none absolute inset-0 z-10 bg-background/50' />
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className='w-12'>Loại</TableHead>
                        <TableHead>Trình duyệt / Hệ điều hành</TableHead>
                        <TableHead>Địa chỉ IP</TableHead>
                        <TableHead>Đăng nhập lúc</TableHead>
                        <TableHead>Hết hạn</TableHead>
                        <TableHead className='w-24'>Thao tác</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((session) => (
                        <TableRow
                            key={session.id}
                            className={
                                session.id === currentSessionId
                                    ? 'bg-green-50/50'
                                    : undefined
                            }
                        >
                            <TableCell>
                                <div className='flex items-center gap-2'>
                                    <Badge
                                        variant={getDeviceBadgeVariant(
                                            session.deviceType,
                                        )}
                                    >
                                        <span className='flex items-center gap-1'>
                                            {getDeviceIcon(
                                                session.deviceType ?? 'desktop',
                                            )}
                                        </span>
                                    </Badge>
                                    {session.id === currentSessionId && (
                                        <Badge
                                            variant='green'
                                            appearance='emphasized'
                                        >
                                            Hiện tại
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className='space-y-0.5'>
                                    <p className='font-medium'>
                                        {session.browser}
                                        {session.deviceModel &&
                                            ` - ${session.deviceModel}`}
                                    </p>
                                    <p className='text-sm text-muted-foreground'>
                                        {session.os}
                                        {session.deviceVendor &&
                                            ` (${session.deviceVendor})`}
                                    </p>
                                </div>
                            </TableCell>
                            <TableCell className='font-mono text-sm'>
                                {session.ipAddress}
                            </TableCell>
                            <TableCell>
                                {formatDate(session.createdAt)}
                            </TableCell>
                            <TableCell>
                                <div className='space-y-0.5'>
                                    <p>{formatDate(session.expiredAt)}</p>
                                    <p className='text-xs text-muted-foreground'>
                                        {formatRelativeTime(session.expiredAt)}
                                    </p>
                                </div>
                            </TableCell>
                            <TableCell>
                                {session.id !== currentSessionId && (
                                    <Button
                                        variant='destructive'
                                        size='sm'
                                        onClick={() =>
                                            onDeleteSession(session.id)
                                        }
                                        disabled={isDeletePending}
                                    >
                                        {isDeletePending
                                            ? 'Đang xóa...'
                                            : 'Xóa'}
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
