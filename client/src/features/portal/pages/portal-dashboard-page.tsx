import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchPortalMe } from '@/features/portal/api/portal-api';
import { ROLE_LABELS } from '@/lib/labels';

export function PortalDashboardPage() {
    const { session } = useAuth();

    const meQuery = useQuery({
        queryKey: ['portal', 'me'],
        queryFn: fetchPortalMe,
        enabled: Boolean(session),
    });

    if (meQuery.isLoading) return <LoadingState />;
    if (meQuery.isError) {
        return (
            <ErrorState
                message='Không tải được thông tin portal'
                onRetry={() => void meQuery.refetch()}
            />
        );
    }

    const role = session?.user.role;

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='text-2xl font-semibold'>Portal</h1>
                <p className='text-sm text-muted-foreground'>
                    Xin chào {meQuery.data?.user.fullName} —{' '}
                    {role ? ROLE_LABELS[role] : ''}
                </p>
            </div>

            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {role === 'TEACHER' ? (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>Lớp chủ nhiệm</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Link
                                    to={ROUTES.portalMyClass}
                                    className='text-primary hover:underline'
                                >
                                    Xem lớp CN và danh sách HS
                                </Link>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Thời khóa biểu</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Link
                                    to={ROUTES.portalMySchedule}
                                    className='text-primary hover:underline'
                                >
                                    Xem TKB cá nhân
                                </Link>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Điểm danh lớp môn</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Link
                                    to={ROUTES.portalAttendance}
                                    className='text-primary hover:underline'
                                >
                                    Mở phiên và ghi điểm danh
                                </Link>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Nhập điểm lớp môn</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Link
                                    to={ROUTES.portalGradebook}
                                    className='text-primary hover:underline'
                                >
                                    Tạo đầu điểm và nhập điểm
                                </Link>
                            </CardContent>
                        </Card>
                    </>
                ) : null}

                {role === 'STUDENT' ? (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>Hồ sơ của tôi</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Link
                                    to={ROUTES.portalMyProfile}
                                    className='text-primary hover:underline'
                                >
                                    Xem hồ sơ và lớp hiện tại
                                </Link>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Thời khóa biểu</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Link
                                    to={ROUTES.portalMyClassTimetable}
                                    className='text-primary hover:underline'
                                >
                                    Xem TKB lớp hành chính
                                </Link>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Lớp môn học</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Link
                                    to={ROUTES.portalMyCourseSections}
                                    className='text-primary hover:underline'
                                >
                                    Xem lớp môn của tôi
                                </Link>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Điểm danh</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Link
                                    to={ROUTES.portalMyAttendance}
                                    className='text-primary hover:underline'
                                >
                                    Xem lịch sử điểm danh
                                </Link>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Bảng điểm</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Link
                                    to={ROUTES.portalMyScores}
                                    className='text-primary hover:underline'
                                >
                                    Xem điểm các môn
                                </Link>
                            </CardContent>
                        </Card>
                    </>
                ) : null}

                {role === 'PARENT' ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Con của tôi</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link
                                to={ROUTES.portalMyChildren}
                                className='text-primary hover:underline'
                            >
                                Xem danh sách con
                            </Link>
                        </CardContent>
                    </Card>
                ) : null}
            </div>
        </div>
    );
}
