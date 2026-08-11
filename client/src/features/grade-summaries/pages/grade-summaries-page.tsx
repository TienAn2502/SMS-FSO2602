import { type ColumnDef } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTableGrid } from '@/components/common/data-table-grid';
import { DataPagination } from '@/components/common/data-pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchHomeroomClasses } from '@/features/homeroom-classes/api/homeroom-classes-api';
import {
  fetchSemesterSummaries,
  fetchYearSummaries,
  recomputeGradeSummaries,
  recomputeYearSummaries,
  type SemesterSummaryItem,
  type YearSummaryItem,
} from '@/features/grade-summaries/api/grade-summaries-api';
import { SemesterFinalizePanel } from '@/features/grade-summaries/components/semester-finalize-panel';
import { GradeSummariesExportActions } from '@/features/grade-summaries/components/grade-summaries-export-actions';
import { YearFinalizePanel } from '@/features/grade-summaries/components/year-finalize-panel';
import { YearNextEnrollmentsPanel } from '@/features/grade-summaries/components/year-next-enrollments-panel';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCourseSectionListFilters } from '@/features/course-sections/hooks/use-course-section-list-filters';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import {
  ACADEMIC_RESULT_LEVEL_LABELS,
  PROMOTION_DECISION_LABELS,
  SUMMARY_STATUS_LABELS,
  TRAINING_RESULT_LEVEL_LABELS,
} from '@/lib/labels';
import { selectClassName } from '@/lib/form-styles';

const PAGE_SIZE = 20;

export function GradeSummariesPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'semester' | 'year'>('semester');
  const [homeroomClassId, setHomeroomClassId] = useState('');

  const {
    yearFilter,
    semesterFilter,
    filtersReady,
    years,
    filterSemesters,
    semestersByYearId,
    setYearFilter,
    setSemesterFilter,
  } = useCourseSectionListFilters(() => setPage(1), {
    requireAcademicPeriod: true,
  });

  const promotionFinalizeState = useMemo(() => {
    if (!yearFilter) {
      return {
        disabled: true,
        reason: 'Chọn năm học để chốt lên lớp',
      };
    }

    const selectedYear = years.find((year) => year.id === yearFilter);
    if (!selectedYear?.isCurrent) {
      return {
        disabled: true,
        reason: 'Chỉ chốt lên lớp cho năm học hiện tại',
      };
    }

    const yearSemesters = semestersByYearId.get(yearFilter) ?? [];
    const hasHk2 = yearSemesters.some((semester) => semester.code === 'HK2');
    if (!hasHk2) {
      return {
        disabled: true,
        reason: 'Năm học chưa có học kỳ 2 — chưa thể chốt lên lớp',
      };
    }

    const currentSemester = yearSemesters.find((semester) => semester.isCurrent);
    if (currentSemester?.code === 'HK1') {
      return {
        disabled: true,
        reason: 'Đang trong học kỳ 1 — chốt lên lớp sau khi kết thúc HK2',
      };
    }

    return { disabled: false, reason: null };
  }, [yearFilter, years, semestersByYearId]);

  const homeroomsQuery = useQuery({
    queryKey: ['homeroom-classes', session?.activeSchoolId, yearFilter],
    queryFn: () =>
      fetchHomeroomClasses({
        limit: 100,
        academicYearId: yearFilter,
        status: 'ACTIVE',
      }),
    enabled: Boolean(session?.activeSchoolId && yearFilter),
  });

  const semesterQuery = useQuery({
    queryKey: [
      'grade-summaries',
      'semester',
      session?.activeSchoolId,
      page,
      semesterFilter,
      homeroomClassId,
    ],
    queryFn: () =>
      fetchSemesterSummaries({
        page,
        limit: PAGE_SIZE,
        semesterId: semesterFilter,
        homeroomClassId: homeroomClassId || undefined,
      }),
    enabled:
      tab === 'semester' &&
      Boolean(session?.activeSchoolId) &&
      filtersReady &&
      Boolean(semesterFilter),
  });

  const yearQuery = useQuery({
    queryKey: [
      'grade-summaries',
      'year',
      session?.activeSchoolId,
      page,
      yearFilter,
      homeroomClassId,
    ],
    queryFn: () =>
      fetchYearSummaries({
        page,
        limit: PAGE_SIZE,
        academicYearId: yearFilter,
        homeroomClassId: homeroomClassId || undefined,
      }),
    enabled:
      tab === 'year' &&
      Boolean(session?.activeSchoolId) &&
      Boolean(yearFilter),
    placeholderData: keepPreviousData,
  });

  const recomputeMutation = useMutation({
    mutationFn: () =>
      recomputeGradeSummaries({
        semesterId: semesterFilter!,
        homeroomClassId: homeroomClassId || undefined,
      }),
    onSuccess: (data) => {
      toast.success(
        `Tái tính: ${data.subjectResultsUpserted} môn, ${data.semesterSummariesUpserted} HS`,
      );
      void queryClient.invalidateQueries({ queryKey: ['grade-summaries'] });
    },
    onError: (error) => toast.error(getErrorMessage(getApiError(error))),
  });

  const recomputeYearMutation = useMutation({
    mutationFn: () => recomputeYearSummaries(yearFilter!),
    onSuccess: (data) => {
      toast.success(`Đã tái tính tổng kết năm: ${data.yearSummariesUpserted} học sinh`);
      void queryClient.invalidateQueries({ queryKey: ['grade-summaries'] });
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Tái tính năm thất bại'),
      );
    },
  });

  const semesterColumns = useMemo<ColumnDef<SemesterSummaryItem>[]>(
    () => [
      { accessorKey: 'studentFullName', header: 'Học sinh' },
      { accessorKey: 'homeroomClassCode', header: 'Lớp HC' },
      { accessorKey: 'overallAverage', header: 'TB HK' },
      {
        accessorKey: 'academicResultLevel',
        header: 'Học lực',
        cell: ({ row }) =>
          row.original.academicResultLevel
            ? ACADEMIC_RESULT_LEVEL_LABELS[row.original.academicResultLevel]
            : '—',
      },
      {
        accessorKey: 'trainingResultLevel',
        header: 'Rèn luyện',
        cell: ({ row }) =>
          row.original.trainingResultLevel
            ? TRAINING_RESULT_LEVEL_LABELS[row.original.trainingResultLevel]
            : '—',
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => SUMMARY_STATUS_LABELS[row.original.status],
      },
    ],
    [],
  );

  const yearColumns = useMemo<ColumnDef<YearSummaryItem>[]>(
    () => [
      { accessorKey: 'studentFullName', header: 'Học sinh' },
      { accessorKey: 'homeroomClassCode', header: 'Lớp HC' },
      { accessorKey: 'overallAverage', header: 'TB năm' },
      {
        accessorKey: 'academicResultLevel',
        header: 'Học lực',
        cell: ({ row }) =>
          row.original.academicResultLevel
            ? ACADEMIC_RESULT_LEVEL_LABELS[row.original.academicResultLevel]
            : '—',
      },
      {
        accessorKey: 'trainingResultLevel',
        header: 'Rèn luyện',
        cell: ({ row }) =>
          row.original.trainingResultLevel
            ? TRAINING_RESULT_LEVEL_LABELS[row.original.trainingResultLevel]
            : '—',
      },
      {
        accessorKey: 'absentSessionCount',
        header: 'Buổi vắng',
        cell: ({ row }) => row.original.absentSessionCount ?? '—',
      },
      {
        accessorKey: 'promotionDecision',
        header: 'Quyết định',
        cell: ({ row }) =>
          PROMOTION_DECISION_LABELS[row.original.promotionDecision],
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => SUMMARY_STATUS_LABELS[row.original.status],
      },
    ],
    [],
  );

  const selectedSemesterName = useMemo(
    () => filterSemesters.find((semester) => semester.id === semesterFilter)?.name,
    [filterSemesters, semesterFilter],
  );

  const activeQuery = tab === 'semester' ? semesterQuery : yearQuery;
  const isSemesterFetching =
    tab === 'semester' && semesterQuery.isFetching && !semesterQuery.isLoading;

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Tổng kết học tập</h1>
        <p className='text-sm text-muted-foreground'>
          Tra cứu, tái tính và khóa tổng kết học kỳ / năm
        </p>
      </div>

      <div className='flex gap-2'>
        <Button
          variant={tab === 'semester' ? 'default' : 'outline'}
          onClick={() => {
            setTab('semester');
            setPage(1);
          }}
        >
          Học kỳ
        </Button>
        <Button
          variant={tab === 'year' ? 'default' : 'outline'}
          onClick={() => {
            setTab('year');
            setPage(1);
          }}
        >
          Cả năm / Lên lớp
        </Button>
      </div>

      <Card>
        <CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <CardTitle>Bộ lọc & thao tác</CardTitle>
          <GradeSummariesExportActions
            tab={tab}
            semesterId={semesterFilter}
            academicYearId={yearFilter}
            homeroomClassId={homeroomClassId || undefined}
          />
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='max-w-xs space-y-2'>
            <label className='text-sm font-medium'>Lớp chủ nhiệm</label>
            <select
              className={selectClassName}
              value={homeroomClassId}
              onChange={(e) => setHomeroomClassId(e.target.value)}
            >
              <option value=''>Tất cả lớp</option>
              {homeroomsQuery.data?.items.map((c) => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </select>
          </div>

          {tab === 'semester' ? (
            <div className='flex flex-wrap gap-2'>
              <select
                className={selectClassName}
                value={yearFilter ?? ''}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
              <select
                className={selectClassName}
                value={semesterFilter ?? ''}
                onChange={(e) => setSemesterFilter(e.target.value)}
              >
                {filterSemesters.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <Button
                variant='outline'
                disabled={!semesterFilter || recomputeMutation.isPending}
                onClick={() => recomputeMutation.mutate()}
              >
                Tái tính
              </Button>
            </div>
          ) : (
            <div className='space-y-2'>
              <div className='flex flex-wrap gap-2'>
                <select
                  className={selectClassName}
                  value={yearFilter ?? ''}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
                <Button
                  variant='outline'
                  disabled={!yearFilter || recomputeYearMutation.isPending}
                  onClick={() => recomputeYearMutation.mutate()}
                >
                  Tái tính năm
                </Button>
              </div>
              {promotionFinalizeState.reason ? (
                <p className='text-sm text-muted-foreground'>
                  {promotionFinalizeState.reason}
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {tab === 'semester' && semesterFilter ? (
        <SemesterFinalizePanel
          semesterId={semesterFilter}
          onSelectHomeroom={setHomeroomClassId}
        />
      ) : null}

      {tab === 'year' && yearFilter ? (
        <>
          <YearFinalizePanel
            academicYearId={yearFilter}
            disabledReason={
              promotionFinalizeState.disabled
                ? promotionFinalizeState.reason
                : null
            }
            onSelectHomeroom={setHomeroomClassId}
          />
          <YearNextEnrollmentsPanel
            sourceAcademicYearId={yearFilter}
            homeroomClassId={homeroomClassId || undefined}
          />
        </>
      ) : null}

      {tab === 'semester' && selectedSemesterName ? (
        <p className='text-sm text-muted-foreground'>
          Đang xem: <span className='font-medium text-foreground'>{selectedSemesterName}</span>
          {isSemesterFetching ? ' — đang tải…' : null}
        </p>
      ) : null}

      {activeQuery.isLoading ? <LoadingState /> : null}
      {activeQuery.isError ? (
        <ErrorState message='Không tải được dữ liệu' onRetry={() => void activeQuery.refetch()} />
      ) : null}

      {activeQuery.data?.items.length === 0 && !activeQuery.isLoading ? (
        <EmptyState title='Chưa có dữ liệu tổng kết' />
      ) : null}

      {tab === 'semester' && semesterQuery.data?.items.length ? (
        <>
          <DataTableGrid columns={semesterColumns} data={semesterQuery.data.items} />
          <DataPagination
            page={page}
            totalPages={semesterQuery.data.meta.totalPages}
            onPageChange={setPage}
          />
        </>
      ) : null}

      {tab === 'year' && yearQuery.data?.items.length ? (
        <>
          <DataTableGrid columns={yearColumns} data={yearQuery.data.items} />
          <DataPagination
            page={page}
            totalPages={yearQuery.data.meta.totalPages}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </div>
  );
}
