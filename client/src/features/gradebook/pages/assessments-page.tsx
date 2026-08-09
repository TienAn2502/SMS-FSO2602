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
import { Label } from '@/components/ui/label';
import { CourseSectionListFilters } from '@/features/course-sections/components/course-section-list-filters';
import { useCourseSectionListFilters } from '@/features/course-sections/hooks/use-course-section-list-filters';
import {
  fetchGradebookOverview,
  type GradebookOverviewItem,
  type GradebookOverviewStatus,
} from '@/features/gradebook/api/gradebook-api';
import { GradebookOverviewStatusBadge } from '@/features/gradebook/components/assessment-status-badges';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { GRADEBOOK_OVERVIEW_STATUS_LABELS } from '@/lib/labels';
import { selectClassName } from '@/lib/form-styles';

const PAGE_SIZE = 20;

export function AssessmentsPage() {
  const { session } = useAuth();
  const [page, setPage] = useState(1);
  const [gradebookStatusFilter, setGradebookStatusFilter] = useState<
    'ALL' | GradebookOverviewStatus
  >('ALL');

  const {
    debouncedSearch,
    globalFilter,
    yearFilter,
    semesterFilter,
    subjectFilter,
    filtersReady,
    years,
    subjects,
    filterSemesters,
    setGlobalFilter,
    setYearFilter,
    setSemesterFilter,
    setSubjectFilter,
  } = useCourseSectionListFilters(() => setPage(1), {
    requireAcademicPeriod: true,
  });

  const listQuery = useQuery({
    queryKey: [
      'gradebook-overview',
      session?.activeSchoolId,
      page,
      debouncedSearch,
      yearFilter,
      semesterFilter,
      subjectFilter,
      gradebookStatusFilter,
    ],
    queryFn: () =>
      fetchGradebookOverview({
        page,
        limit: PAGE_SIZE,
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(yearFilter ? { academicYearId: yearFilter } : {}),
        ...(semesterFilter ? { semesterId: semesterFilter } : {}),
        ...(subjectFilter ? { subjectId: subjectFilter } : {}),
        ...(gradebookStatusFilter !== 'ALL'
          ? { gradebookStatus: gradebookStatusFilter }
          : {}),
      }),
    enabled: filtersReady && Boolean(yearFilter),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo<ColumnDef<GradebookOverviewItem>[]>(
    () => [
      { accessorKey: 'courseSectionCode', header: 'Lớp môn' },
      {
        id: 'subject',
        header: 'Môn',
        cell: ({ row }) =>
          row.original.subjectName ?? row.original.subjectCode,
      },
      {
        accessorKey: 'homeroomClassCode',
        header: 'Lớp HC',
        cell: ({ row }) => row.original.homeroomClassCode ?? '—',
      },
      {
        accessorKey: 'teacherFullName',
        header: 'Giáo viên',
        cell: ({ row }) => row.original.teacherFullName ?? '—',
      },
      { accessorKey: 'semesterName', header: 'Học kỳ' },
      {
        id: 'scores',
        header: 'Tiến độ chấm',
        cell: ({ row }) =>
          row.original.scoreCount > 0
            ? `${row.original.scoredCount}/${row.original.scoreCount}`
            : '—',
      },
      {
        accessorKey: 'gradebookStatus',
        header: 'Trạng thái sổ',
        cell: ({ row }) => (
          <GradebookOverviewStatusBadge status={row.original.gradebookStatus} />
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Link
            to={`${ROUTES.assessmentsSection}/${row.original.courseSectionId}`}
            className='text-primary hover:underline'
          >
            Xem chi tiết
          </Link>
        ),
      },
    ],
    [],
  );

  if (!filtersReady || listQuery.isLoading) return <LoadingState />;
  if (listQuery.isError) {
    return (
      <ErrorState
        message='Không tải được tổng quan sổ điểm'
        onRetry={() => void listQuery.refetch()}
      />
    );
  }

  const items = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Sổ điểm</h1>
        <p className='text-sm text-muted-foreground'>
          Giám sát tiến độ nhập điểm toàn trường — giáo viên nhập điểm qua
          Portal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <CourseSectionListFilters
            idPrefix='gradebook-overview'
            requireAcademicPeriod
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            yearFilter={yearFilter}
            semesterFilter={semesterFilter}
            subjectFilter={subjectFilter}
            statusFilter={undefined}
            years={years}
            filterSemesters={filterSemesters}
            subjects={subjects}
            onYearFilterChange={setYearFilter}
            onSemesterFilterChange={setSemesterFilter}
            onSubjectFilterChange={setSubjectFilter}
            onStatusFilterChange={() => undefined}
          />
          <div className='space-y-1'>
            <Label htmlFor='gradebookStatusFilter'>Trạng thái sổ</Label>
            <select
              id='gradebookStatusFilter'
              className={selectClassName}
              value={gradebookStatusFilter}
              onChange={(event) => {
                setPage(1);
                setGradebookStatusFilter(
                  event.target.value as 'ALL' | GradebookOverviewStatus,
                );
              }}
            >
              <option value='ALL'>Tất cả</option>
              {(
                Object.keys(
                  GRADEBOOK_OVERVIEW_STATUS_LABELS,
                ) as GradebookOverviewStatus[]
              ).map((status) => (
                <option key={status} value={status}>
                  {GRADEBOOK_OVERVIEW_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyState title='Không có lớp môn phù hợp' />
      ) : (
        <>
          <DataTableGrid columns={columns} data={items} />
          {meta ? (
            <DataPagination
              page={meta.page}
              totalPages={meta.totalPages}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
