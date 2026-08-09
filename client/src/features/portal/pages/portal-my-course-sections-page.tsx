import { type ColumnDef } from '@tanstack/react-table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { DataTableGrid } from '@/components/common/data-table-grid';
import { DataPagination } from '@/components/common/data-pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CourseSectionListFilters } from '@/features/course-sections/components/course-section-list-filters';
import { useCourseSectionListFilters } from '@/features/course-sections/hooks/use-course-section-list-filters';
import { type CourseSection } from '@/features/course-sections/api/course-sections-api';
import { fetchMyCourseSections } from '@/features/portal/api/portal-api';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { AcademicEntityStatus } from '@/types/api.types';

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<AcademicEntityStatus, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    INACTIVE: 'bg-muted text-muted-foreground',
};

export function PortalMyCourseSectionsPage() {
    const [page, setPage] = useState(1);

    const {
        globalFilter,
        debouncedSearch,
        yearFilter,
        semesterFilter,
        subjectFilter,
        statusFilter,
        filtersReady,
        filtersActive,
        years,
        subjects,
        filterSemesters,
        semesterMap,
        setGlobalFilter,
        setYearFilter,
        setSemesterFilter,
        setSubjectFilter,
        setStatusFilter,
    } = useCourseSectionListFilters(() => setPage(1));

    const listQuery = useQuery({
        queryKey: [
            'portal',
            'my-course-sections',
            debouncedSearch,
            yearFilter,
            semesterFilter,
            subjectFilter,
            statusFilter,
            page,
        ],
        queryFn: () =>
            fetchMyCourseSections({
                search: debouncedSearch || undefined,
                academicYearId: yearFilter,
                semesterId: semesterFilter,
                subjectId: subjectFilter,
                status: statusFilter,
                page,
                limit: PAGE_SIZE,
            }),
        enabled: filtersReady,
        placeholderData: keepPreviousData,
    });

    const columns = useMemo<ColumnDef<CourseSection>[]>(
        () => [
            {
                accessorKey: 'code',
                header: 'Mã lớp môn',
                cell: ({ row }) => (
                    <Link
                        to={`${ROUTES.courseSections}/${row.original.id}`}
                        className='font-medium text-primary hover:underline'
                        onClick={(event) => event.stopPropagation()}
                    >
                        {row.original.code}
                    </Link>
                ),
            },
            { accessorKey: 'name', header: 'Tên lớp môn' },
            {
                id: 'semester',
                header: 'Học kỳ',
                cell: ({ row }) =>
                    semesterMap.get(row.original.semesterId)?.name ?? '—',
            },
            {
                accessorKey: 'status',
                header: 'Trạng thái',
                cell: ({ row }) => (
                    <span
                        className={cn(
                            'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                            STATUS_BADGE[row.original.status],
                        )}
                    >
                        {ACADEMIC_STATUS_LABELS[row.original.status]}
                    </span>
                ),
            },
        ],
        [semesterMap],
    );

    const items = listQuery.data?.items ?? [];

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
                    Lớp môn học của tôi
                </h1>
                <p className='text-sm text-muted-foreground'>
                    Danh sách lớp môn theo lớp hành chính và học kỳ ghi danh
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Danh sách lớp môn</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <CourseSectionListFilters
                        idPrefix='portal-cs'
                        globalFilter={globalFilter}
                        onGlobalFilterChange={setGlobalFilter}
                        yearFilter={yearFilter}
                        semesterFilter={semesterFilter}
                        subjectFilter={subjectFilter}
                        statusFilter={statusFilter}
                        years={years}
                        filterSemesters={filterSemesters}
                        subjects={subjects}
                        onYearFilterChange={setYearFilter}
                        onSemesterFilterChange={setSemesterFilter}
                        onSubjectFilterChange={setSubjectFilter}
                        onStatusFilterChange={setStatusFilter}
                    />

                    {listQuery.isError ? (
                        <ErrorState
                            message='Không tải được danh sách lớp môn học'
                            onRetry={() => void listQuery.refetch()}
                        />
                    ) : null}

                    <div className='relative rounded-lg border border-border'>
                        {listQuery.isFetching && !listQuery.isLoading ? (
                            <div className='absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]'>
                                <LoadingState message='Đang tải dữ liệu...' />
                            </div>
                        ) : null}

                        {listQuery.isLoading || !filtersReady ? (
                            <LoadingState message='Đang tải danh sách...' />
                        ) : !filtersActive && items.length === 0 ? (
                            <EmptyState
                                title='Chưa có lớp môn học'
                                description='Chưa ghi danh lớp hoặc chưa có lớp môn trong kỳ đã chọn'
                            />
                        ) : (
                            <DataTableGrid
                                data={items}
                                columns={columns}
                                getRowHref={(row) =>
                                    `${ROUTES.courseSections}/${row.id}`
                                }
                            />
                        )}
                    </div>

                    {!listQuery.isLoading &&
                    filtersReady &&
                    (items.length > 0 || filtersActive) ? (
                        <DataPagination
                            page={listQuery.data?.meta.page ?? page}
                            totalPages={listQuery.data?.meta.totalPages ?? 1}
                            onPageChange={setPage}
                        />
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
