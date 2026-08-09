import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CourseSectionListFilters } from '@/features/course-sections/components/course-section-list-filters';
import { useCourseSectionListFilters } from '@/features/course-sections/hooks/use-course-section-list-filters';
import { StudentScoresGrid } from '@/features/portal/components/student-scores-grid';
import { PortalScoresExportActions } from '@/features/portal/components/portal-scores-export-actions';
import { fetchMyScoresGrid } from '@/features/portal/api/portal-api';

export function PortalMyScoresPage() {
    const {
        yearFilter,
        semesterFilter,
        filtersReady,
        years,
        filterSemesters,
        setYearFilter,
        setSemesterFilter,
    } = useCourseSectionListFilters(() => undefined, {
        requireAcademicPeriod: true,
    });

    const gridQuery = useQuery({
        queryKey: ['portal', 'my-scores-grid', yearFilter, semesterFilter],
        queryFn: () =>
            fetchMyScoresGrid({
                semesterId: semesterFilter!,
                academicYearId: yearFilter,
            }),
        enabled: filtersReady && Boolean(yearFilter && semesterFilter),
        placeholderData: keepPreviousData,
    });

    const scoresGrid = gridQuery.data;

    return (
        <div className='space-y-6'>
            <div>
                <Link
                    to={ROUTES.portal}
                    className='text-sm text-muted-foreground hover:text-foreground'
                >
                    ← Portal
                </Link>
                <h1 className='mt-2 text-2xl font-semibold'>
                    Bảng điểm của tôi
                </h1>
                <p className='text-sm text-muted-foreground'>
                    Điểm TX / GK / CK theo học kỳ
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Bộ lọc</CardTitle>
                </CardHeader>
                <CardContent>
                    <CourseSectionListFilters
                        idPrefix='portal-my-scores'
                        academicPeriodOnly
                        requireAcademicPeriod
                        globalFilter=''
                        onGlobalFilterChange={() => undefined}
                        yearFilter={yearFilter}
                        semesterFilter={semesterFilter}
                        subjectFilter={undefined}
                        statusFilter={undefined}
                        years={years}
                        filterSemesters={filterSemesters}
                        subjects={[]}
                        onYearFilterChange={setYearFilter}
                        onSemesterFilterChange={setSemesterFilter}
                        onSubjectFilterChange={() => undefined}
                        onStatusFilterChange={() => undefined}
                    />
                </CardContent>
            </Card>

            {!filtersReady || gridQuery.isLoading ? (
                <LoadingState message='Đang tải bảng điểm...' />
            ) : gridQuery.isError ? (
                <ErrorState
                    message='Không tải được bảng điểm'
                    onRetry={() => void gridQuery.refetch()}
                />
            ) : !scoresGrid ? (
                <EmptyState title='Chọn năm học và học kỳ để xem điểm' />
            ) : !scoresGrid.homeroomClassCode ? (
                <EmptyState title='Chưa có ghi danh cho học kỳ đã chọn' />
            ) : (
                <div className='space-y-4'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                        <p className='text-sm text-muted-foreground'>
                            {scoresGrid.academicYearName} ·{' '}
                            {scoresGrid.semesterName}
                            {scoresGrid.homeroomClassCode
                                ? ` · Lớp ${scoresGrid.homeroomClassCode}`
                                : null}
                        </p>
                        <PortalScoresExportActions
                            semesterId={semesterFilter}
                            academicYearId={yearFilter}
                        />
                    </div>

                    <StudentScoresGrid grid={scoresGrid} />
                </div>
            )}
        </div>
    );
}
