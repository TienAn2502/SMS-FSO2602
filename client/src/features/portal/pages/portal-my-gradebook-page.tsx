import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useMemo } from 'react';

import { ROUTES } from '@/app/router/routes';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CourseSectionListFilters } from '@/features/course-sections/components/course-section-list-filters';
import { useCourseSectionListFilters } from '@/features/course-sections/hooks/use-course-section-list-filters';
import { fetchMyGradebookClasses, type PortalGradebookClassSummary } from '@/features/portal/api/portal-api';

export function PortalMyGradebookPage() {
    const {
        yearFilter,
        debouncedSearch,
        globalFilter,
        filtersReady,
        years,
        setYearFilter,
        setGlobalFilter,
    } = useCourseSectionListFilters(() => undefined, {
        requireAcademicPeriod: true,
        yearOnly: true,
    });

    const listQuery = useQuery({
        queryKey: ['portal', 'my-gradebook-classes', yearFilter],
        queryFn: () =>
            fetchMyGradebookClasses(
                yearFilter ? { academicYearId: yearFilter } : undefined,
            ),
        enabled: filtersReady && Boolean(yearFilter),
        placeholderData: keepPreviousData,
    });

    const classGroups = useMemo(() => {
        const map = new Map<string, PortalGradebookClassSummary>();

        for (const item of listQuery.data ?? []) {
            if (!map.has(item.courseSectionCode)) {
                map.set(item.courseSectionCode, item);
            }
        }

        const search = debouncedSearch.trim().toLowerCase();

        return [...map.values()]
            .filter((item) => {
                if (!search) {
                    return true;
                }

                const haystack = [
                    item.courseSectionCode,
                    item.courseSectionName,
                    item.subjectName,
                    item.subjectCode,
                    item.homeroomClassCode,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return haystack.includes(search);
            })
            .sort((left, right) =>
                left.courseSectionCode.localeCompare(right.courseSectionCode),
            );
    }, [listQuery.data, debouncedSearch]);

    const selectedYearName =
        years.find((year) => year.id === yearFilter)?.name ?? '';

    return (
        <div className='space-y-6'>
            <div>
                <Link
                    to={ROUTES.portal}
                    className='text-sm text-muted-foreground hover:text-foreground'
                >
                    ← Portal
                </Link>
                <h1 className='mt-2 text-2xl font-semibold'>Sổ điểm</h1>
                <p className='text-sm text-muted-foreground'>
                    Các lớp môn bạn được phân công — chọn lớp rồi chọn học kỳ
                    để nhập điểm TX / GK / CK.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Bộ lọc</CardTitle>
                </CardHeader>
                <CardContent>
                    <CourseSectionListFilters
                        idPrefix='portal-gradebook'
                        yearOnly
                        requireAcademicPeriod
                        globalFilter={globalFilter}
                        onGlobalFilterChange={setGlobalFilter}
                        yearFilter={yearFilter}
                        semesterFilter={undefined}
                        subjectFilter={undefined}
                        statusFilter={undefined}
                        years={years}
                        filterSemesters={[]}
                        subjects={[]}
                        onYearFilterChange={setYearFilter}
                        onSemesterFilterChange={() => undefined}
                        onSubjectFilterChange={() => undefined}
                        onStatusFilterChange={() => undefined}
                    />
                </CardContent>
            </Card>

            {!filtersReady || listQuery.isLoading ? (
                <LoadingState message='Đang tải danh sách lớp môn...' />
            ) : listQuery.isError ? (
                <ErrorState
                    message='Không tải được danh sách lớp môn'
                    onRetry={() => void listQuery.refetch()}
                />
            ) : classGroups.length === 0 ? (
                <EmptyState
                    title={
                        debouncedSearch.trim()
                            ? 'Không tìm thấy lớp môn phù hợp'
                            : 'Chưa có lớp môn được phân công'
                    }
                    description={
                        debouncedSearch.trim()
                            ? `Không có kết quả cho "${debouncedSearch.trim()}".`
                            : selectedYearName
                              ? `Không có lớp môn nào trong năm học ${selectedYearName}.`
                              : undefined
                    }
                />
            ) : (
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {classGroups.map((item) => (
                        <Link
                            key={item.courseSectionCode}
                            to={`${ROUTES.portalGradebook}/select/${encodeURIComponent(item.courseSectionCode)}?academicYearId=${yearFilter}`}
                            className='block transition-opacity hover:opacity-90'
                        >
                            <Card className='h-full'>
                                <CardHeader>
                                    <CardTitle className='text-base'>
                                        {item.courseSectionCode}
                                    </CardTitle>
                                    <p className='text-sm text-muted-foreground'>
                                        {item.courseSectionName}
                                    </p>
                                </CardHeader>
                                <CardContent className='space-y-1 text-sm text-muted-foreground'>
                                    <p>
                                        Môn:{' '}
                                        {item.subjectName ?? item.subjectCode}
                                    </p>
                                    {item.homeroomClassCode ? (
                                        <p>Lớp HC: {item.homeroomClassCode}</p>
                                    ) : null}
                                    <p>Chọn học kỳ để mở sổ điểm</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
