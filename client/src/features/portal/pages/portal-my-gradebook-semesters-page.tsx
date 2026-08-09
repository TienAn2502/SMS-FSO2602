import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchMyGradebookClasses } from '@/features/portal/api/portal-api';

export function PortalMyGradebookSemestersPage() {
    const { courseSectionCode } = useParams<{ courseSectionCode: string }>();
    const [searchParams] = useSearchParams();
    const academicYearId = searchParams.get('academicYearId') ?? undefined;
    const decodedCode = courseSectionCode
        ? decodeURIComponent(courseSectionCode)
        : '';

    const listQuery = useQuery({
        queryKey: ['portal', 'my-gradebook-classes', academicYearId],
        queryFn: () =>
            fetchMyGradebookClasses(
                academicYearId ? { academicYearId } : undefined,
            ),
        enabled: Boolean(decodedCode),
    });

    if (listQuery.isLoading) return <LoadingState />;
    if (listQuery.isError) {
        return (
            <ErrorState
                message='Không tải được danh sách lớp môn'
                onRetry={() => void listQuery.refetch()}
            />
        );
    }

    const semesterOptions = (listQuery.data ?? [])
        .filter((item) => item.courseSectionCode === decodedCode)
        .sort((left, right) =>
            left.semesterCode.localeCompare(right.semesterCode),
        );

    const classInfo = semesterOptions[0];

    if (!classInfo) {
        return (
            <div className='space-y-6'>
                <Link
                    to={ROUTES.portalGradebook}
                    className='text-sm text-muted-foreground hover:text-foreground'
                >
                    ← Danh sách lớp môn
                </Link>
                <EmptyState title='Không tìm thấy lớp môn đã chọn' />
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <div>
                <Link
                    to={ROUTES.portalGradebook}
                    className='text-sm text-muted-foreground hover:text-foreground'
                >
                    ← Danh sách lớp môn
                </Link>
                <h1 className='mt-2 text-2xl font-semibold'>
                    {classInfo.courseSectionCode} —{' '}
                    {classInfo.courseSectionName}
                </h1>
                <p className='text-sm text-muted-foreground'>
                    {classInfo.subjectName ?? classInfo.subjectCode}
                    {classInfo.homeroomClassCode
                        ? ` · Lớp HC ${classInfo.homeroomClassCode}`
                        : ''}
                </p>
                <p className='mt-1 text-sm text-muted-foreground'>
                    Chọn học kỳ để mở sổ điểm
                </p>
            </div>

            {semesterOptions.length === 0 ? (
                <EmptyState title='Chưa có học kỳ nào cho lớp môn này' />
            ) : (
                <div className='grid gap-4 sm:grid-cols-2'>
                    {semesterOptions.map((item) => (
                        <Card key={item.courseSectionId}>
                            <CardHeader>
                                <CardTitle className='text-lg'>
                                    {item.semesterName}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    render={
                                        <Link
                                            to={`${ROUTES.portalGradebook}/${item.courseSectionId}`}
                                        />
                                    }
                                >
                                    Mở sổ điểm {item.semesterName}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
