import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef, type ColumnFiltersState } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
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
import { fetchAllAcademicYears, fetchSemesters } from '@/features/academic-years/api/academic-years-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchAllGradeLevels } from '@/features/grade-levels/api/grade-levels-api';
import {
  createCourseSection,
  fetchCourseSections,
  updateCourseSectionStatus,
  type CourseSection,
} from '@/features/course-sections/api/course-sections-api';
import { fetchHomeroomClasses } from '@/features/homeroom-classes/api/homeroom-classes-api';
import { fetchAllSubjects } from '@/features/subjects/api/subjects-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
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

const createSchema = z
  .object({
    academicYearId: z.string().uuid('Chọn năm học'),
    semesterId: z.string().uuid('Chọn học kỳ'),
    subjectId: z.string().uuid('Chọn môn học'),
    homeroomClassId: z.string().optional(),
    gradeLevelId: z.string().optional(),
    name: z.string().trim().min(1, 'Tên lớp môn là bắt buộc'),
    code: z.string().trim().min(1, 'Mã lớp môn là bắt buộc'),
  })
  .superRefine((value, ctx) => {
    if (!value.homeroomClassId && !value.gradeLevelId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Chọn lớp HC hoặc khối',
        path: ['gradeLevelId'],
      });
    }
  });

type CreateFormValues = z.infer<typeof createSchema>;

const STATUS_BADGE: Record<AcademicEntityStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground',
};

export function CourseSectionsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const debouncedSearch = useDebouncedValue(globalFilter, 300);

  const yearFilter = getColumnFilterValue<string>(columnFilters, 'academicYearId');
  const semesterFilter = getColumnFilterValue<string>(columnFilters, 'semesterId');
  const subjectFilter = getColumnFilterValue<string>(columnFilters, 'subjectId');
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

  const semestersQueries = useQueries({
    queries: years.map((year) => ({
      queryKey: ['semesters', session?.activeSchoolId, year.id],
      queryFn: () => fetchSemesters(year.id),
      enabled: Boolean(session?.activeSchoolId),
    })),
  });

  const semesterMap = useMemo(() => {
    const map = new Map<string, { name: string; academicYearId: string }>();
    for (const query of semestersQueries) {
      for (const semester of query.data ?? []) {
        map.set(semester.id, {
          name: semester.name,
          academicYearId: semester.academicYearId,
        });
      }
    }
    return map;
  }, [semestersQueries]);

  const filterSemesters = useMemo(() => {
    if (!yearFilter) {
      return [];
    }
    return [...semesterMap.entries()]
      .filter(([, semester]) => semester.academicYearId === yearFilter)
      .map(([id, semester]) => ({ id, name: semester.name }));
  }, [semesterMap, yearFilter]);

  const subjectsQuery = useQuery({
    queryKey: ['subjects', session?.activeSchoolId, 'all'],
    queryFn: fetchAllSubjects,
    enabled: Boolean(session?.activeSchoolId),
  });

  const gradesQuery = useQuery({
    queryKey: ['grade-levels', session?.activeSchoolId, 'all'],
    queryFn: fetchAllGradeLevels,
    enabled: Boolean(session?.activeSchoolId),
  });

  const listQuery = useQuery({
    queryKey: [
      'course-sections',
      session?.activeSchoolId,
      debouncedSearch,
      yearFilter,
      semesterFilter,
      subjectFilter,
      statusFilter,
      page,
    ],
    queryFn: () =>
      fetchCourseSections({
        search: debouncedSearch || undefined,
        academicYearId: yearFilter,
        semesterId: semesterFilter,
        subjectId: subjectFilter,
        status: statusFilter,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: Boolean(session?.activeSchoolId),
    placeholderData: keepPreviousData,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      academicYearId: '',
      semesterId: '',
      subjectId: '',
      homeroomClassId: '',
      gradeLevelId: '',
      name: '',
      code: '',
    },
  });

  const formYearId = watch('academicYearId');
  const formHomeroomClassId = watch('homeroomClassId');

  const formSemestersQuery = useQuery({
    queryKey: ['semesters', session?.activeSchoolId, 'form', formYearId],
    queryFn: () => fetchSemesters(formYearId),
    enabled: Boolean(session?.activeSchoolId && formYearId),
  });

  const homeroomClassesQuery = useQuery({
    queryKey: [
      'homeroom-classes',
      session?.activeSchoolId,
      'form',
      formYearId,
    ],
    queryFn: () =>
      fetchHomeroomClasses({
        academicYearId: formYearId,
        limit: 100,
        page: 1,
        status: 'ACTIVE',
      }),
    enabled: Boolean(session?.activeSchoolId && formYearId),
  });

  const createMutation = useMutation({
    mutationFn: createCourseSection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['course-sections'] });
      toast.success('Tạo lớp môn học thành công');
      reset();
      setShowForm(false);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Tạo lớp môn thất bại'),
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AcademicEntityStatus }) =>
      updateCourseSectionStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['course-sections'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Thất bại'));
    },
  });

  const handleToggleStatus = useCallback(
    (id: string, status: AcademicEntityStatus) => {
      statusMutation.mutate({ id, status });
    },
    [statusMutation],
  );

  const columns = useMemo<ColumnDef<CourseSection>[]>(
    () => [
      { accessorKey: 'code', header: 'Mã lớp môn' },
      { accessorKey: 'name', header: 'Tên lớp môn' },
      {
        id: 'semester',
        header: 'Học kỳ',
        cell: ({ row }) => semesterMap.get(row.original.semesterId)?.name ?? '—',
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
      {
        id: 'actions',
        header: () => <span className='sr-only'>Thao tác</span>,
        cell: ({ row }) => (
          <Button
            variant='outline'
            size='sm'
            disabled={statusMutation.isPending}
            onClick={() =>
              handleToggleStatus(
                row.original.id,
                row.original.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
              )
            }
          >
            {row.original.status === 'ACTIVE' ? 'Ngưng' : 'Kích hoạt'}
          </Button>
        ),
      },
    ],
    [handleToggleStatus, semesterMap, statusMutation.isPending],
  );

  const items = listQuery.data?.items ?? [];
  const filtersActive = hasColumnFilters(columnFilters, globalFilter);
  const subjects = subjectsQuery.data?.items ?? [];
  const grades = gradesQuery.data?.items ?? [];
  const homeroomClasses = homeroomClassesQuery.data?.items ?? [];
  const formSemesters = formSemestersQuery.data ?? [];

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Lớp môn học</h1>
          <p className='text-sm text-muted-foreground'>
            Quản lý lớp môn theo học kỳ, môn và lớp hành chính
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Đóng form' : 'Thêm lớp môn'}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Tạo lớp môn học</CardTitle>
            <CardDescription>
              Gắn lớp HC hoặc chọn khối riêng cho lớp ghép
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className='grid gap-4 md:grid-cols-2'
              onSubmit={handleSubmit((values) =>
                createMutation.mutate({
                  semesterId: values.semesterId,
                  subjectId: values.subjectId,
                  name: values.name,
                  code: values.code,
                  homeroomClassId: values.homeroomClassId || null,
                  gradeLevelId: values.homeroomClassId
                    ? undefined
                    : values.gradeLevelId,
                }),
              )}
            >
              <div className='space-y-2'>
                <Label htmlFor='cs-year'>Năm học</Label>
                <select
                  id='cs-year'
                  className={selectClassName}
                  {...register('academicYearId', {
                    onChange: () => {
                      reset((values) => ({
                        ...values,
                        semesterId: '',
                        homeroomClassId: '',
                      }));
                    },
                  })}
                >
                  <option value=''>Chọn năm học</option>
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='cs-semester'>Học kỳ</Label>
                <select
                  id='cs-semester'
                  className={selectClassName}
                  disabled={!formYearId}
                  {...register('semesterId')}
                >
                  <option value=''>Chọn học kỳ</option>
                  {formSemesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.semesterId ? (
                  <p className='text-sm text-destructive'>
                    {errors.semesterId.message}
                  </p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='cs-subject'>Môn học</Label>
                <select id='cs-subject' className={selectClassName} {...register('subjectId')}>
                  <option value=''>Chọn môn</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='cs-hc'>Lớp hành chính (tuỳ chọn)</Label>
                <select
                  id='cs-hc'
                  className={selectClassName}
                  disabled={!formYearId}
                  {...register('homeroomClassId')}
                >
                  <option value=''>Không gắn / lớp ghép</option>
                  {homeroomClasses.map((hc) => (
                    <option key={hc.id} value={hc.id}>
                      {hc.name}
                    </option>
                  ))}
                </select>
              </div>
              {!formHomeroomClassId ? (
                <div className='space-y-2'>
                  <Label htmlFor='cs-grade'>Khối (khi không gắn lớp HC)</Label>
                  <select id='cs-grade' className={selectClassName} {...register('gradeLevelId')}>
                    <option value=''>Chọn khối</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  {errors.gradeLevelId ? (
                    <p className='text-sm text-destructive'>
                      {errors.gradeLevelId.message}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className='space-y-2'>
                <Label htmlFor='cs-code'>Mã lớp môn</Label>
                <Input id='cs-code' {...register('code')} placeholder='TOAN-10A1' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='cs-name'>Tên lớp môn</Label>
                <Input id='cs-name' {...register('name')} placeholder='Toán 10A1' />
              </div>
              <div className='md:col-span-2'>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting ? 'Đang tạo...' : 'Tạo lớp môn học'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách lớp môn học</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='cs-search'>Tìm kiếm</Label>
              <Input
                id='cs-search'
                placeholder='Mã hoặc tên lớp môn...'
                value={globalFilter}
                onChange={(e) => {
                  setGlobalFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='cs-filter-year'>Năm học</Label>
              <select
                id='cs-filter-year'
                className={selectClassName}
                value={yearFilter ?? ''}
                onChange={(e) => {
                  setColumnFilters((prev) =>
                    setColumnFilterValue(
                      setColumnFilterValue(
                        prev,
                        'academicYearId',
                        e.target.value || undefined,
                      ),
                      'semesterId',
                      undefined,
                    ),
                  );
                  setPage(1);
                }}
              >
                <option value=''>Tất cả</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='cs-filter-semester'>Học kỳ</Label>
              <select
                id='cs-filter-semester'
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
                <option value=''>Tất cả</option>
                {filterSemesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='cs-filter-subject'>Môn học</Label>
              <select
                id='cs-filter-subject'
                className={selectClassName}
                value={subjectFilter ?? ''}
                onChange={(e) => {
                  setColumnFilters(
                    setColumnFilterValue(
                      columnFilters,
                      'subjectId',
                      e.target.value || undefined,
                    ),
                  );
                  setPage(1);
                }}
              >
                <option value=''>Tất cả</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='cs-filter-status'>Trạng thái</Label>
              <select
                id='cs-filter-status'
                className={selectClassName}
                value={statusFilter ?? ''}
                onChange={(e) => {
                  setColumnFilters(
                    setColumnFilterValue(
                      columnFilters,
                      'status',
                      e.target.value || undefined,
                    ),
                  );
                  setPage(1);
                }}
              >
                <option value=''>Tất cả</option>
                {(Object.keys(ACADEMIC_STATUS_LABELS) as AcademicEntityStatus[]).map(
                  (status) => (
                    <option key={status} value={status}>
                      {ACADEMIC_STATUS_LABELS[status]}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

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

            {listQuery.isLoading ? (
              <LoadingState message='Đang tải danh sách...' />
            ) : !filtersActive && items.length === 0 ? (
              <EmptyState
                title='Chưa có lớp môn học'
                description='Tạo lớp môn học đầu tiên'
              />
            ) : (
              <DataTableGrid data={items} columns={columns} />
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
