import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef, type ColumnFiltersState } from '@tanstack/react-table';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { DataTableGrid } from '@/components/common/data-table-grid';
import { DataPagination } from '@/components/common/data-pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchAllAcademicYears,
  fetchSemesters,
} from '@/features/academic-years/api/academic-years-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchCourseSections } from '@/features/course-sections/api/course-sections-api';
import { fetchAllTeachers } from '@/features/teachers/api/teachers-api';
import {
  createTeachingAssignment,
  fetchTeachingAssignments,
  updateTeachingAssignmentStatus,
  type TeachingAssignment,
} from '@/features/teaching-assignments/api/teaching-assignments-api';
import { TeachingAssignmentsImportExportActions } from '@/features/teaching-assignments/components/teaching-assignments-import-export-actions';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDateVi } from '@/lib/date-format';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import {
  getColumnFilterValue,
  hasColumnFilters,
  setColumnFilterValue,
} from '@/lib/table-filters';
import { cn } from '@/lib/utils';
import type { AcademicEntityStatus } from '@/types/api.types';

const PAGE_SIZE = 20;

const createSchema = z.object({
  teacherId: z.string().uuid('Chọn giáo viên'),
  courseSectionId: z.string().uuid('Chọn lớp môn'),
  assignAt: z.string().min(1, 'Chọn ngày phân công'),
});

function buildListParams(options: {
  page: number;
  search?: string;
  yearFilter?: string;
  semesterFilter?: string;
  teacherFilter?: string;
  statusFilter?: AcademicEntityStatus;
}) {
  const params: Parameters<typeof fetchTeachingAssignments>[0] = {
    page: options.page,
    limit: PAGE_SIZE,
    search: options.search,
    teacherId: options.teacherFilter,
    status: options.statusFilter,
  };

  if (!options.yearFilter) {
    params.includeAllSemesters = true;
    return params;
  }

  if (!options.semesterFilter) {
    params.academicYearId = options.yearFilter;
    params.includeAllSemesters = true;
    return params;
  }

  params.semesterId = options.semesterFilter;
  params.includeAllSemesters = true;
  return params;
}

export function TeachingAssignmentsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const filtersInitializedRef = useRef(false);
  const debouncedSearch = useDebouncedValue(globalFilter, 300);

  const yearFilter = getColumnFilterValue<string>(columnFilters, 'academicYearId');
  const semesterFilter = getColumnFilterValue<string>(
    columnFilters,
    'semesterId',
  );
  const teacherFilter = getColumnFilterValue<string>(columnFilters, 'teacherId');
  const statusFilter = getColumnFilterValue<AcademicEntityStatus>(
    columnFilters,
    'status',
  );

  const yearsQuery = useQuery({
    queryKey: ['academic-years', session?.activeSchoolId, 'all'],
    queryFn: fetchAllAcademicYears,
    enabled: Boolean(session?.activeSchoolId),
  });

  const years = yearsQuery.data?.items ?? [];

  const semestersQuery = useQuery({
    queryKey: ['semesters', session?.activeSchoolId, yearFilter],
    queryFn: () => fetchSemesters(yearFilter!),
    enabled: Boolean(session?.activeSchoolId && yearFilter),
  });

  const semesters = semestersQuery.data ?? [];

  useEffect(() => {
    filtersInitializedRef.current = false;
    setFiltersReady(false);
    setColumnFilters([]);
  }, [session?.activeSchoolId]);

  useEffect(() => {
    if (filtersInitializedRef.current || yearsQuery.isLoading) {
      return;
    }

    if (!years.length) {
      setFiltersReady(true);
      return;
    }

    const currentYear = years.find((year) => year.isCurrent);
    if (!currentYear) {
      filtersInitializedRef.current = true;
      setFiltersReady(true);
      return;
    }

    if (!yearFilter) {
      setColumnFilters([{ id: 'academicYearId', value: currentYear.id }]);
      return;
    }

    if (semestersQuery.isLoading) {
      return;
    }

    const currentSemester = semesters.find((semester) => semester.isCurrent);
    filtersInitializedRef.current = true;
    setColumnFilters((prev) => {
      const hasSemester = prev.some((filter) => filter.id === 'semesterId');
      if (hasSemester || !currentSemester) {
        return prev;
      }

      return [...prev, { id: 'semesterId', value: currentSemester.id }];
    });
    setFiltersReady(true);
  }, [
    years,
    yearsQuery.isLoading,
    yearFilter,
    semesters,
    semestersQuery.isLoading,
  ]);

  const listQuery = useQuery({
    queryKey: [
      'teaching-assignments',
      session?.activeSchoolId,
      debouncedSearch,
      yearFilter,
      semesterFilter,
      teacherFilter,
      statusFilter,
      page,
    ],
    queryFn: () =>
      fetchTeachingAssignments(
        buildListParams({
          page,
          search: debouncedSearch || undefined,
          yearFilter,
          semesterFilter,
          teacherFilter,
          statusFilter,
        }),
      ),
    enabled: Boolean(session?.activeSchoolId && filtersReady),
    placeholderData: keepPreviousData,
  });

  const teachersQuery = useQuery({
    queryKey: ['teachers', session?.activeSchoolId, 'all'],
    queryFn: fetchAllTeachers,
    enabled: Boolean(session?.activeSchoolId),
  });

  const sectionsQuery = useQuery({
    queryKey: ['course-sections', session?.activeSchoolId, 'all'],
    queryFn: () => fetchCourseSections({ limit: 100, status: 'ACTIVE' }),
    enabled: Boolean(session?.activeSchoolId && showForm),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { assignAt: new Date().toISOString().slice(0, 10) },
  });

  const createMutation = useMutation({
    mutationFn: createTeachingAssignment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teaching-assignments'] });
      toast.success('Phân công thành công');
      reset({ assignAt: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Phân công thất bại'),
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: (id: string) => updateTeachingAssignmentStatus(id, 'INACTIVE'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teaching-assignments'] });
      toast.success('Đã kết thúc phân công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'),
      );
    },
  });

  const columns = useMemo<ColumnDef<TeachingAssignment>[]>(
    () => [
      { accessorKey: 'teacherFullName', header: 'Giáo viên' },
      { accessorKey: 'courseSectionCode', header: 'Lớp môn' },
      {
        accessorKey: 'assignAt',
        header: 'Ngày PC',
        cell: ({ row }) => formatDateVi(row.original.assignAt),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
              row.original.status === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-700'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {ACADEMIC_STATUS_LABELS[row.original.status]}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) =>
          row.original.status === 'ACTIVE' ? (
            <Button
              variant='outline'
              size='sm'
              onClick={() => statusMutation.mutate(row.original.id)}
            >
              Kết thúc
            </Button>
          ) : null,
      },
    ],
    [statusMutation],
  );

  const items = listQuery.data?.items ?? [];
  const filtersActive = hasColumnFilters(columnFilters, globalFilter);
  const teachers = teachersQuery.data ?? [];

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Phân công giảng dạy</h1>
          <p className='text-sm text-muted-foreground'>
            Gán giáo viên dạy lớp môn theo năm học và học kỳ
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Đóng form' : 'Thêm phân công'}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Phân công mới</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className='grid gap-4 md:grid-cols-2'
              onSubmit={handleSubmit((values) => createMutation.mutate(values))}
            >
              <div className='space-y-2'>
                <Label>Giáo viên</Label>
                <select className={selectClassName} {...register('teacherId')}>
                  <option value=''>— Chọn —</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
                {errors.teacherId ? (
                  <p className='text-sm text-destructive'>
                    {errors.teacherId.message}
                  </p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label>Lớp môn</Label>
                <select className={selectClassName} {...register('courseSectionId')}>
                  <option value=''>— Chọn —</option>
                  {sectionsQuery.data?.items.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.code} — {section.name}
                    </option>
                  ))}
                </select>
                {errors.courseSectionId ? (
                  <p className='text-sm text-destructive'>
                    {errors.courseSectionId.message}
                  </p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label>Ngày phân công</Label>
                <input
                  type='date'
                  className={selectClassName}
                  {...register('assignAt')}
                />
              </div>
              <div className='flex items-end'>
                <Button
                  type='submit'
                  disabled={isSubmitting || createMutation.isPending}
                >
                  Lưu
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <CardTitle>Danh sách phân công</CardTitle>
            <CardDescription>
              Bộ lọc áp dụng cho danh sách và export file
            </CardDescription>
          </div>
          <TeachingAssignmentsImportExportActions
            exportFilters={{
              search: debouncedSearch || undefined,
              academicYearId: yearFilter,
              semesterId: semesterFilter,
              teacherId: teacherFilter,
              status: statusFilter,
            }}
            importOpen={importOpen}
            onImportOpenChange={setImportOpen}
            onImportSuccess={() => {
              void queryClient.invalidateQueries({
                queryKey: ['teaching-assignments'],
              });
            }}
          />
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
            <div className='space-y-1.5'>
              <Label htmlFor='ta-search'>Tìm kiếm</Label>
              <Input
                id='ta-search'
                placeholder='GV, mã hoặc tên lớp môn...'
                value={globalFilter}
                onChange={(e) => {
                  setGlobalFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='ta-year'>Năm học</Label>
              <select
                id='ta-year'
                className={selectClassName}
                value={yearFilter ?? ''}
                onChange={(e) => {
                  setColumnFilters((prev) => {
                    const next = setColumnFilterValue(
                      prev,
                      'academicYearId',
                      e.target.value || undefined,
                    );
                    return setColumnFilterValue(next, 'semesterId', undefined);
                  });
                  setPage(1);
                }}
              >
                <option value=''>Tất cả</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                    {year.isCurrent ? ' (hiện tại)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='ta-semester'>Học kỳ</Label>
              <select
                id='ta-semester'
                className={selectClassName}
                value={semesterFilter ?? ''}
                disabled={!yearFilter}
                onChange={(e) => {
                  setColumnFilters(
                    setColumnFilterValue(
                      columnFilters,
                      'semesterId',
                      e.target.value || undefined,
                    ),
                  );
                  setPage(1);
                }}
              >
                <option value=''>Tất cả học kỳ</option>
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name}
                    {semester.isCurrent ? ' (hiện tại)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='ta-teacher'>Giáo viên</Label>
              <select
                id='ta-teacher'
                className={selectClassName}
                value={teacherFilter ?? ''}
                onChange={(e) => {
                  setColumnFilters(
                    setColumnFilterValue(
                      columnFilters,
                      'teacherId',
                      e.target.value || undefined,
                    ),
                  );
                  setPage(1);
                }}
              >
                <option value=''>Tất cả</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='ta-status'>Trạng thái</Label>
              <select
                id='ta-status'
                className={selectClassName}
                value={statusFilter ?? ''}
                onChange={(e) => {
                  setColumnFilters(
                    setColumnFilterValue(
                      columnFilters,
                      'status',
                      (e.target.value || undefined) as
                        | AcademicEntityStatus
                        | undefined,
                    ),
                  );
                  setPage(1);
                }}
              >
                <option value=''>Tất cả</option>
                {(
                  Object.keys(ACADEMIC_STATUS_LABELS) as AcademicEntityStatus[]
                ).map((status) => (
                  <option key={status} value={status}>
                    {ACADEMIC_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {listQuery.isError ? (
            <ErrorState
              message='Không tải được phân công'
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}

          <div className='relative rounded-lg border border-border'>
            {listQuery.isFetching && !listQuery.isLoading ? (
              <div className='absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]'>
                <LoadingState message='Đang tải dữ liệu...' />
              </div>
            ) : null}

            {listQuery.isLoading ? (
              <LoadingState message='Đang tải danh sách...' />
            ) : !filtersActive && items.length === 0 ? (
              <EmptyState title='Chưa có phân công' />
            ) : items.length === 0 ? (
              <EmptyState title='Không có phân công phù hợp bộ lọc' />
            ) : (
              <DataTableGrid columns={columns} data={items} />
            )}
          </div>

          {!listQuery.isLoading && (items.length > 0 || filtersActive) ? (
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
