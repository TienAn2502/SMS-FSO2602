import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CourseSectionListFilters } from '@/features/course-sections/components/course-section-list-filters';
import { useCourseSectionListFilters } from '@/features/course-sections/hooks/use-course-section-list-filters';
import {
    fetchMyChildScoresGrid,
    fetchMyChildSummaries,
} from '@/features/portal/api/portal-api';
import { StudentSummariesView } from '@/features/portal/components/student-summaries-view';

export function PortalChildSummariesPage() {
    const { studentId = '' } = useParams();
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

    const enabled =
        Boolean(studentId) && filtersReady && Boolean(semesterFilter);

    const summariesQuery = useQuery({
        queryKey: [
            'portal',
            'child-summaries',
            studentId,
            yearFilter,
            semesterFilter,
        ],
        queryFn: () =>
            fetchMyChildSummaries(studentId, {
                semesterId: semesterFilter!,
                academicYearId: yearFilter,
            }),
        enabled,
        placeholderData: keepPreviousData,
    });

    const scoresGridQuery = useQuery({
        queryKey: [
            'portal',
            'child-scores-grid',
            studentId,
            yearFilter,
            semesterFilter,
        ],
        queryFn: () =>
            fetchMyChildScoresGrid(studentId, {
                semesterId: semesterFilter!,
                academicYearId: yearFilter,
            }),
        enabled,
        placeholderData: keepPreviousData,
    });

    const isLoading = summariesQuery.isLoading || scoresGridQuery.isLoading;
    const isError = summariesQuery.isError || scoresGridQuery.isError;

    return (
        <div className='space-y-6'>
            <div>
                <Link
                    to={ROUTES.portalMyChildren}
                    className='text-sm text-muted-foreground hover:text-foreground'
                >
                    ← Con của tôi
                </Link>
                <h1 className='mt-2 text-2xl font-semibold'>
                    Tổng kết học tập
                </h1>
                <p className='text-sm text-muted-foreground'>
                    Bảng điểm chi tiết và kết quả học kỳ đã chốt
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Bộ lọc</CardTitle>
                </CardHeader>
                <CardContent>
                    <CourseSectionListFilters
                        idPrefix='portal-child-summaries'
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

            {isLoading ? <LoadingState /> : null}
            {isError ? (
                <ErrorState
                    message='Không tải được tổng kết'
                    onRetry={() => {
                        void summariesQuery.refetch();
                        void scoresGridQuery.refetch();
                    }}
                />
            ) : null}
            {summariesQuery.data ? (
                <StudentSummariesView
                    data={summariesQuery.data}
                    scoresGrid={scoresGridQuery.data}
                />
            ) : null}
        </div>
    );
}
