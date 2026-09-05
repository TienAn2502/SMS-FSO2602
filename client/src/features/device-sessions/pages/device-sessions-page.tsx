import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
    deleteAllDeviceSessions,
    deleteOneDeviceSession,
    fetchDeviceSessions,
    type DeviceSessionItem,
    type DeviceSessionsResponse,
} from '@/features/device-sessions/api/device-sessions-api';

import {
    AlertCircle,
    Badge,
    Clock,
    LaptopMinimal,
    LogOut,
    ShieldCheck,
    Smartphone,
    Tablet,
    Timer,
} from 'lucide-react';
import { formatDate } from '@/features/device-sessions/utils';

function getDeviceIcon(deviceType: string | null) {
    switch (deviceType?.toLowerCase()) {
        case 'desktop':
            return <LaptopMinimal className='w-8 h-8' />;
        case 'tablet':
            return <Tablet className='w-8 h-8' />;
        case 'mobile':
            return <Smartphone className='w-8 h-8' />;
        default:
            return <LaptopMinimal className='w-8 h-8' />;
    }
}

function getDeviceName(device: DeviceSessionItem) {
    if (device.deviceModel) {
        return `${device.deviceVendor ?? ''} ${device.deviceModel}`.trim();
    }

    return `${device.os} ${device.browser}`;
}

export function DeviceSessionsPage() {
    const { session } = useAuth();
    const queryClient = useQueryClient();

    const [actionType, setActionType] = useState<'single' | 'all' | null>(null);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

    const userId = session?.user.id;

    const deviceSessionsQuery = useQuery<DeviceSessionsResponse>({
        queryKey: ['device-sessions', userId],
        queryFn: () => fetchDeviceSessions(userId!),
        enabled: Boolean(userId),
    });

    const sessionsList = deviceSessionsQuery.data?.devices ?? [];
    const totalCount = deviceSessionsQuery.data?.totalCount ?? 0;
    const currentSession = session?.user.sessionId;

    const deleteOneSessionMutation = useMutation({
        mutationFn: deleteOneDeviceSession,
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ['device-sessions'],
            });
            toast.success('Đăng xuất thiết bị thành công');
            handleCloseDialog();
        },
        onError: () => {
            toast.error('Không thể đăng xuất thiết bị');
        },
    });

    const deleteAllSessionsMutation = useMutation({
        mutationFn: deleteAllDeviceSessions,
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ['device-sessions'],
            });
            toast.success('Đăng xuất tất cả thiết bị thành công');
            handleCloseDialog();
        },
        onError: () => {
            toast.error('Không thể đăng xuất tất cả thiết bị');
        },
    });

    const handleCloseDialog = () => {
        setActionType(null);
        setSessionToDelete(null);
    };

    const handleConfirmAction = () => {
        if (actionType === 'single' && sessionToDelete) {
            deleteOneSessionMutation.mutate(sessionToDelete);
        } else if (actionType === 'all') {
            // Lấy toàn bộ id ngoại trừ thiết bị hiện tại để truyền lên API
            const sessionIds = sessionsList
                .filter((s) => s.id !== currentSession)
                .map((s) => `session:${s.id}`);
            deleteAllSessionsMutation.mutate(sessionIds);
        }
    };

    // Sắp xếp để thiết bị hiện tại luôn ở trên đầu
    const sortedSessionsList = [...sessionsList].sort((a, b) => {
        if (a.id === currentSession) return -1; // Đẩy a lên đầu
        if (b.id === currentSession) return 1; // Đẩy b lên đầu
        return 0;
    });

    const currentDevice = sessionsList?.find((s) => s.id === currentSession);
    const isPending =
        deleteOneSessionMutation.isPending ||
        deleteAllSessionsMutation.isPending;
    const isDialogOpen = actionType !== null;

    if (deviceSessionsQuery.isLoading) {
        return (
            <div className='p-5 text-sm text-gray-400'>
                Đang tải thông tin thiết bị...
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
                <div>
                    <h1 className='text-2xl font-semibold'>Quản lý thiết bị</h1>
                    <p className='text-sm text-muted-foreground'>
                        Xem và quản lý các thiết bị đã đăng nhập
                    </p>
                </div>
                <Button
                    variant='outline'
                    onClick={() => void deviceSessionsQuery.refetch()}
                    disabled={deviceSessionsQuery.isFetching}
                >
                    Làm mới
                </Button>
            </div>

            <div>
                <Card
                    className={`rounded-2xl border-2 shadow-sm transition-all border-green-200 bg-linear-to-br from-green-50 to-emerald-50`}
                >
                    <CardContent className='p-5 flex flex-col gap-3'>
                        <div className='flex items-start justify-between gap-3'>
                            <div className='flex items-start gap-3'>
                                <div className='p-3 rounded-xl border-2 bg-white border-green-200 text-green-700'>
                                    {getDeviceIcon(
                                        currentDevice?.deviceType ?? 'desktop',
                                    )}
                                </div>
                                <div className='flex flex-col gap-1'>
                                    <span className='text-sm font-bold text-gray-900'>
                                        {getDeviceName(currentDevice!)}
                                    </span>
                                    <p className='text-sm text-gray-700'>
                                        {currentDevice?.os} ·{' '}
                                        {currentDevice?.deviceType ||
                                            'Máy tính'}
                                    </p>
                                    <p className='text-xs text-gray-600'>
                                        IP: {currentDevice?.ipAddress}
                                    </p>
                                </div>
                            </div>
                            <Badge className='rounded-xl bg-green-100 text-green-700 border border-green-200 text-xs font-semibold shadow-sm hover:bg-green-100'>
                                <ShieldCheck className='w-3.5 h-3.5 mr-1' />
                                Đang sử dụng
                            </Badge>
                        </div>
                        <div className='flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600 pt-1 border-t border-gray-100/60 mt-1'>
                            <span className='inline-flex items-center gap-1.5'>
                                <Clock className='w-3.5 h-3.5' /> Đăng nhập lúc{' '}
                                {currentDevice
                                    ? formatDate(currentDevice.createdAt)
                                    : ''}
                            </span>
                            <span className='inline-flex items-center gap-1.5'>
                                <Timer className='w-3.5 h-3.5' /> Hết hạn phiên:{' '}
                                {currentDevice
                                    ? formatDate(currentDevice.expiredAt)
                                    : ''}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className='mx-auto p-2'>
                <CardHeader className='flex flex-row items-center justify-between pb-4'>
                    <div>
                        <CardTitle className='text-lg font-bold text-foreground'>
                            Tất cả phiên đăng nhập
                        </CardTitle>
                        <CardDescription className='text-sm text-muted-foreground mt-1'>
                            {totalCount} thiết bị khác đang đăng nhập
                        </CardDescription>
                    </div>
                    {totalCount > 0 && (
                        <Button
                            variant='destructive'
                            onClick={() => setActionType('all')}
                            className='flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-destructive/10 text-destructive'
                        >
                            <LogOut className='w-4 h-4' />
                            Đăng xuất tất cả
                        </Button>
                    )}
                </CardHeader>

                <CardContent className='space-y-4'>
                    <div className='space-y-3'>
                        {sortedSessionsList.map((session) => {
                            const isCurrentDevice =
                                session.id === currentSession;
                            return (
                                <div
                                    key={session.id}
                                    className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-muted/50 border rounded-xl'
                                >
                                    <div className='flex items-start gap-3'>
                                        <div className='p-2 bg-background border rounded-lg text-foreground shadow-xs shrink-0'>
                                            {getDeviceIcon(
                                                session.deviceType ?? 'desktop',
                                            )}
                                        </div>
                                        <div className='space-y-1 min-w-0'>
                                            <div className='flex flex-wrap items-center gap-2'>
                                                <span className='font-semibold text-sm sm:text-base text-foreground truncate'>
                                                    {getDeviceName(session)}
                                                </span>
                                                {isCurrentDevice && (
                                                    <span className='inline-flex items-center px-2 py-0.5 text-[10px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full'>
                                                        Đang sử dụng
                                                    </span>
                                                )}
                                            </div>
                                            <p className='text-xs sm:text-sm text-muted-foreground'>
                                                {session.os} ·{' '}
                                                {session.deviceType ??
                                                    'computer'}
                                            </p>
                                            <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
                                                <span>
                                                    IP: {session.ipAddress}
                                                </span>
                                                <span className='inline-flex items-center gap-1'>
                                                    🕒{' '}
                                                    {formatDate(
                                                        session.createdAt,
                                                    )}
                                                </span>
                                            </div>
                                            {!isCurrentDevice && (
                                                <div className='text-xs text-amber-600 dark:text-amber-400 font-medium'>
                                                    ⏰ Hết hạn:{' '}
                                                    {formatDate(
                                                        session.expiredAt,
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {!isCurrentDevice && (
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => {
                                                setActionType('single');
                                                setSessionToDelete(session.id);
                                            }}
                                            className='flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground transition-colors self-end sm:self-auto w-full sm:w-auto mt-1 sm:mt-0'
                                        >
                                            <LogOut className='w-4 h-4' />
                                            Đăng xuất
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className='flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl'>
                        <AlertCircle className='w-5 h-5 text-amber-500 shrink-0 mt-0.5' />
                        <div>
                            <h4 className='text-sm font-semibold text-foreground'>
                                Lưu ý bảo mật
                            </h4>
                            <p className='text-sm text-muted-foreground mt-0.5'>
                                Nếu bạn không nhận ra một thiết bị nào trong
                                danh sách, hãy đăng xuất ngay lập tức để bảo vệ
                                tài khoản của bạn.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* AlertDialog dùng chung cho cả 2 trường hợp */}
            <AlertDialog
                open={isDialogOpen}
                onOpenChange={(open) => !open && handleCloseDialog()}
            >
                <AlertDialogContent>
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <h3 className='text-lg font-semibold'>
                                {actionType === 'all'
                                    ? 'Xác nhận đăng xuất tất cả'
                                    : 'Xác nhận đăng xuất'}
                            </h3>
                            <p className='text-sm text-muted-foreground'>
                                {actionType === 'all'
                                    ? 'Bạn có chắc chắn muốn đăng xuất khỏi tất cả các thiết bị khác? Tất cả các phiên làm việc đó sẽ bị hủy ngay lập tức.'
                                    : 'Bạn có chắc chắn muốn đăng xuất khỏi thiết bị này? Thiết bị sẽ bị đăng xuất ngay lập tức.'}
                            </p>
                        </div>
                        <div className='flex justify-end gap-2'>
                            <Button
                                variant='outline'
                                onClick={handleCloseDialog}
                                disabled={isPending}
                            >
                                Hủy
                            </Button>
                            <Button
                                variant='destructive'
                                onClick={handleConfirmAction}
                                disabled={isPending}
                            >
                                {isPending ? 'Đang xử lý...' : 'Đăng xuất'}
                            </Button>
                        </div>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
