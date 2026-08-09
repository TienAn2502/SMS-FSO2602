import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CourseSectionListFilters } from '@/features/course-sections/components/course-section-list-filters';
import { useCourseSectionListFilters } from '@/features/course-sections/hooks/use-course-section-list-filters';
import {
  fetchMyHomeroomClasses,
  fetchMyHomeroomConductRecords,
  upsertMyHomeroomConductRecords,
  type PortalConductRecordRow,
  type PortalTrainingResultLevel,
} from '@/features/portal/api/portal-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { TRAINING_RESULT_LEVEL_LABELS } from '@/lib/labels';
import { selectClassName } from '@/lib/form-styles';

export function PortalHomeroomConductPage() {
  const queryClient = useQueryClient();
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

  const gridQuery = useQuery({
    queryKey: [
      'portal',
      'homeroom-conduct',
      homeroomClassId,
      semesterFilter,
    ],
    queryFn: () =>
      fetchMyHomeroomConductRecords({
        homeroomClassId,
        semesterId: semesterFilter!,
      }),
    enabled:
      Boolean(homeroomClassId) && filtersReady && Boolean(semesterFilter),
  });

  const [draft, setDraft] = useState<PortalConductRecordRow[]>([]);

  useEffect(() => {
    if (gridQuery.data) {
      setDraft(gridQuery.data);
    }
  }, [gridQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertMyHomeroomConductRecords({
        homeroomClassId,
        semesterId: semesterFilter!,
        records: draft.map((row) => ({
          studentId: row.studentId,
          trainingResultLevel: row.trainingResultLevel,
          note: row.note ?? undefined,
        })),
      }),
    onSuccess: () => {
      toast.success('Đã lưu hạnh kiểm');
      void queryClient.invalidateQueries({ queryKey: ['portal', 'homeroom-conduct'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(getApiError(error)));
    },
  });

  if (classesQuery.isLoading) return <LoadingState />;

  return (
    <div className='space-y-6'>
      <div>
        <Link to={ROUTES.portal} className='text-sm text-muted-foreground hover:text-foreground'>
          ← Portal
        </Link>
        <h1 className='mt-2 text-2xl font-semibold'>Hạnh kiểm lớp chủ nhiệm</h1>
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
            idPrefix='portal-homeroom-conduct'
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

      {gridQuery.isLoading ? <LoadingState /> : null}
      {gridQuery.isError ? (
        <ErrorState message='Không tải được hạnh kiểm' onRetry={() => void gridQuery.refetch()} />
      ) : null}

      {draft.length > 0 ? (
        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle>Danh sách học sinh</CardTitle>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              Lưu hạnh kiểm
            </Button>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b text-left text-muted-foreground'>
                    <th className='py-2 pr-4'>Học sinh</th>
                    <th className='py-2 pr-4'>Rèn luyện</th>
                    <th className='py-2'>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.map((row, index) => (
                    <tr key={row.studentId} className='border-b'>
                      <td className='py-2 pr-4'>{row.studentFullName}</td>
                      <td className='py-2 pr-4'>
                        <select
                          className={selectClassName}
                          value={row.trainingResultLevel}
                          onChange={(e) => {
                            const next = [...draft];
                            next[index] = {
                              ...row,
                              trainingResultLevel: e.target
                                .value as PortalTrainingResultLevel,
                            };
                            setDraft(next);
                          }}
                        >
                          {Object.entries(TRAINING_RESULT_LEVEL_LABELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </td>
                      <td className='py-2'>
                        <input
                          className='w-full rounded-md border px-2 py-1'
                          value={row.note ?? ''}
                          onChange={(e) => {
                            const next = [...draft];
                            next[index] = { ...row, note: e.target.value };
                            setDraft(next);
                          }}
                        />
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
