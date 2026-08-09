import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CourseSectionListFilters } from '@/features/course-sections/components/course-section-list-filters';
import { useCourseSectionListFilters } from '@/features/course-sections/hooks/use-course-section-list-filters';
import { fetchMyTimetable } from '@/features/portal/api/portal-api';
import { PortalTimetableExportActions } from '@/features/portal/components/portal-timetable-export-actions';
import { TimetableEntryList } from '@/features/timetable/components/timetable-entry-list';

export function PortalMySchedulePage() {
  const {
    debouncedSearch,
    yearFilter,
    semesterFilter,
    subjectFilter,
    statusFilter,
    filtersReady,
    globalFilter,
    years,
    subjects,
    filterSemesters,
    setGlobalFilter,
    setYearFilter,
    setSemesterFilter,
    setSubjectFilter,
    setStatusFilter,
  } = useCourseSectionListFilters(() => undefined, {
    requireAcademicPeriod: true,
  });

  const timetableQuery = useQuery({
    queryKey: [
      'portal',
      'my-timetable',
      debouncedSearch,
      yearFilter,
      semesterFilter,
      subjectFilter,
      statusFilter,
    ],
    queryFn: () =>
      fetchMyTimetable({
        search: debouncedSearch || undefined,
        academicYearId: yearFilter,
        semesterId: semesterFilter,
        subjectId: subjectFilter,
        status: statusFilter,
      }),
    enabled: filtersReady,
    placeholderData: keepPreviousData,
  });

  const entries = timetableQuery.data ?? [];

  return (
    <div className='space-y-6'>
      <div>
        <Link
          to={ROUTES.portal}
          className='text-sm text-muted-foreground hover:text-foreground'
        >
          ← Portal
        </Link>
        <h1 className='mt-2 text-2xl font-semibold'>Thời khóa biểu của tôi</h1>
        <p className='text-sm text-muted-foreground'>
          Lọc theo năm học, học kỳ, môn học và trạng thái
        </p>
      </div>

      <Card>
        <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-4'>
          <CardTitle>Các tiết dạy</CardTitle>
          <PortalTimetableExportActions
            mode='teacher'
            disabled={!filtersReady || entries.length === 0}
            params={{
              search: debouncedSearch || undefined,
              academicYearId: yearFilter,
              semesterId: semesterFilter,
              subjectId: subjectFilter,
              status: statusFilter,
            }}
          />
        </CardHeader>
        <CardContent className='space-y-4'>
          <CourseSectionListFilters
            idPrefix='portal-tkb'
            requireAcademicPeriod
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

          {timetableQuery.isError ? (
            <ErrorState
              message='Không tải được thời khóa biểu'
              onRetry={() => void timetableQuery.refetch()}
            />
          ) : null}

          {timetableQuery.isLoading || !filtersReady ? (
            <LoadingState message='Đang tải thời khóa biểu...' />
          ) : (
            <TimetableEntryList entries={entries} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
