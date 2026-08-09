import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CourseSectionListFilters } from '@/features/course-sections/components/course-section-list-filters';
import { useCourseSectionListFilters } from '@/features/course-sections/hooks/use-course-section-list-filters';
import {
  fetchMyHomeroomClasses,
  fetchMyHomeroomSummaries,
} from '@/features/portal/api/portal-api';
import {
  ACADEMIC_RESULT_LEVEL_LABELS,
  TRAINING_RESULT_LEVEL_LABELS,
} from '@/lib/labels';
import { selectClassName } from '@/lib/form-styles';

export function PortalHomeroomSummariesPage() {
  const classesQuery = useQuery({
    queryKey: ['portal', 'my-homeroom-classes'],
    queryFn: fetchMyHomeroomClasses,
  });

  const [homeroomClassId, setHomeroomClassId] = useState('');
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

  useEffect(() => {
    if (!homeroomClassId && classesQuery.data?.[0]?.id) {
      setHomeroomClassId(classesQuery.data[0].id);
    }
  }, [classesQuery.data, homeroomClassId]);

  const query = useQuery({
    queryKey: [
      'portal',
      'homeroom-summaries',
      homeroomClassId,
      semesterFilter,
    ],
    queryFn: () =>
      fetchMyHomeroomSummaries({
        homeroomClassId,
        semesterId: semesterFilter!,
      }),
    enabled:
      Boolean(homeroomClassId) && filtersReady && Boolean(semesterFilter),
    placeholderData: keepPreviousData,
  });

  return (
    <div className='space-y-6'>
      <div>
        <Link to={ROUTES.portal} className='text-sm text-muted-foreground hover:text-foreground'>
          ← Portal
        </Link>
        <h1 className='mt-2 text-2xl font-semibold'>Tổng kết lớp chủ nhiệm</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Bộ lọc</CardTitle></CardHeader>
        <CardContent className='space-y-4'>
          <div className='max-w-xs space-y-2'>
            <label className='text-sm font-medium'>Lớp chủ nhiệm</label>
            <select
              className={selectClassName}
              value={homeroomClassId}
              onChange={(e) => setHomeroomClassId(e.target.value)}
            >
              {classesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </select>
          </div>
          <CourseSectionListFilters
            idPrefix='portal-homeroom-summaries'
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

      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? (
        <ErrorState message='Không tải được tổng kết' onRetry={() => void query.refetch()} />
      ) : null}

      {query.data ? (
        <Card>
          <CardHeader>
            <CardTitle>{query.data.homeroomClass.code} — {query.data.homeroomClass.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b text-left text-muted-foreground'>
                    <th className='py-2 pr-4'>Học sinh</th>
                    <th className='py-2 pr-4'>TB HK</th>
                    <th className='py-2 pr-4'>Học lực</th>
                    <th className='py-2'>Rèn luyện</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.rows.map((row) => (
                    <tr key={row.studentFullName} className='border-b'>
                      <td className='py-2 pr-4'>{row.studentFullName}</td>
                      <td className='py-2 pr-4'>{row.overallAverage ?? '—'}</td>
                      <td className='py-2 pr-4'>
                        {row.academicResultLevel
                          ? ACADEMIC_RESULT_LEVEL_LABELS[
                              row.academicResultLevel as keyof typeof ACADEMIC_RESULT_LEVEL_LABELS
                            ]
                          : '—'}
                      </td>
                      <td className='py-2'>
                        {row.trainingResultLevel
                          ? TRAINING_RESULT_LEVEL_LABELS[
                              row.trainingResultLevel as keyof typeof TRAINING_RESULT_LEVEL_LABELS
                            ]
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
