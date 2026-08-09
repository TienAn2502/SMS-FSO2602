import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef, type ColumnFiltersState } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { fetchAllAcademicYears } from '@/features/academic-years/api/academic-years-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchAllGradeLevels } from '@/features/grade-levels/api/grade-levels-api';
import {
  createHomeroomClass,
  fetchHomeroomClasses,
  updateHomeroomClassStatus,
  type HomeroomClass,
} from '@/features/homeroom-classes/api/homeroom-classes-api';
import { HomeroomClassesImportExportActions } from '@/features/homeroom-classes/components/homeroom-classes-import-export-actions';
import { fetchAllTeachers } from '@/features/teachers/api/teachers-api';
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

const createSchema = z.object({
  academicYearId: z.string().uuid('Chọn năm học'),
  gradeLevelId: z.string().uuid('Chọn khối'),
  name: z.string().trim().min(1, 'Tên lớp là bắt buộc'),
  code: z.string().trim().min(1, 'Mã lớp là bắt buộc'),
  capacity: z.string().optional(),
  homeroomTeacherId: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

const STATUS_BADGE: Record<AcademicEntityStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground',
};

export function HomeroomClassesPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(globalFilter, 300);

  const yearFilter = getColumnFilterValue<string>(columnFilters, 'academicYearId');
  const gradeFilter = getColumnFilterValue<string>(columnFilters, 'gradeLevelId');
  const statusFilter = getColumnFilterValue<AcademicEntityStatus>(
    columnFilters,
    'status',
  );

  const yearsQuery = useQuery({
    queryKey: ['academic-years', session?.activeSchoolId, 'all'],
    queryFn: fetchAllAcademicYears,
    enabled: Boolean(session?.activeSchoolId),
  });

  const gradesQuery = useQuery({
    queryKey: ['grade-levels', session?.activeSchoolId, 'all'],
    queryFn: fetchAllGradeLevels,
    enabled: Boolean(session?.activeSchoolId),
  });

  const teachersQuery = useQuery({
    queryKey: ['teachers', session?.activeSchoolId, 'all'],
    queryFn: fetchAllTeachers,
    enabled: Boolean(session?.activeSchoolId),
  });

  const listQuery = useQuery({
    queryKey: [
      'homeroom-classes',
      session?.activeSchoolId,
      debouncedSearch,
      yearFilter,
      gradeFilter,
      statusFilter,
      page,
    ],
    queryFn: () =>
      fetchHomeroomClasses({
        search: debouncedSearch || undefined,
        academicYearId: yearFilter,
        gradeLevelId: gradeFilter,
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
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      academicYearId: '',
      gradeLevelId: '',
      name: '',
      code: '',
      homeroomTeacherId: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: createHomeroomClass,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['homeroom-classes'] });
      toast.success('Tạo lớp hành chính thành công');
      reset();
      setShowForm(false);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Tạo lớp thất bại'),
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AcademicEntityStatus }) =>
      updateHomeroomClassStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['homeroom-classes'] });
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

  const yearMap = useMemo(
    () => new Map((yearsQuery.data?.items ?? []).map((y) => [y.id, y.name])),
    [yearsQuery.data?.items],
  );

  const gradeMap = useMemo(
    () => new Map((gradesQuery.data?.items ?? []).map((g) => [g.id, g.name])),
    [gradesQuery.data?.items],
  );

  const teacherMap = useMemo(
    () =>
      new Map(
        (teachersQuery.data ?? []).map((t) => [t.id, t.fullName]),
      ),
    [teachersQuery.data],
  );

  const columns = useMemo<ColumnDef<HomeroomClass>[]>(
    () => [
      { accessorKey: 'code', header: 'Mã lớp' },
      { accessorKey: 'name', header: 'Tên lớp' },
      {
        id: 'year',
        header: 'Năm học',
        cell: ({ row }) => yearMap.get(row.original.academicYearId) ?? '—',
      },
      {
        id: 'grade',
        header: 'Khối',
        cell: ({ row }) => gradeMap.get(row.original.gradeLevelId) ?? '—',
      },
      {
        id: 'teacher',
        header: 'GVCN',
        cell: ({ row }) =>
          row.original.homeroomTeacherId
            ? (teacherMap.get(row.original.homeroomTeacherId) ?? '—')
            : '—',
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
    [gradeMap, handleToggleStatus, statusMutation.isPending, teacherMap, yearMap],
  );

  const items = listQuery.data?.items ?? [];
  const filtersActive = hasColumnFilters(columnFilters, globalFilter);
  const years = yearsQuery.data?.items ?? [];
  const grades = gradesQuery.data?.items ?? [];
  const teachers = teachersQuery.data ?? [];

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Lớp hành chính</h1>
          <p className='text-sm text-muted-foreground'>
            Quản lý lớp hành chính theo năm học và khối
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Đóng form' : 'Thêm lớp HC'}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Tạo lớp hành chính</CardTitle>
            <CardDescription>Ví dụ: 10A1 thuộc năm học hiện tại</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className='grid gap-4 md:grid-cols-2'
              onSubmit={handleSubmit((values) =>
                createMutation.mutate({
                  academicYearId: values.academicYearId,
                  gradeLevelId: values.gradeLevelId,
                  name: values.name,
                  code: values.code,
                  capacity: values.capacity
                    ? Number(values.capacity)
                    : undefined,
                  homeroomTeacherId: values.homeroomTeacherId || null,
                }),
              )}
            >
              <div className='space-y-2'>
                <Label htmlFor='year'>Năm học</Label>
                <select id='year' className={selectClassName} {...register('academicYearId')}>
                  <option value=''>Chọn năm học</option>
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
                {errors.academicYearId ? (
                  <p className='text-sm text-destructive'>
                    {errors.academicYearId.message}
                  </p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='grade'>Khối</Label>
                <select id='grade' className={selectClassName} {...register('gradeLevelId')}>
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
              <div className='space-y-2'>
                <Label htmlFor='code'>Mã lớp</Label>
                <Input id='code' {...register('code')} placeholder='10A1' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='name'>Tên lớp</Label>
                <Input id='name' {...register('name')} placeholder='10A1' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='capacity'>Sĩ số tối đa</Label>
                <Input id='capacity' type='number' {...register('capacity')} />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='teacher'>GVCN (tuỳ chọn)</Label>
                <select id='teacher' className={selectClassName} {...register('homeroomTeacherId')}>
                  <option value=''>Chưa gán</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className='md:col-span-2'>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting ? 'Đang tạo...' : 'Tạo lớp hành chính'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <CardTitle>Danh sách lớp hành chính</CardTitle>
            <CardDescription>
              Bộ lọc áp dụng cho danh sách và export file
            </CardDescription>
          </div>
          <HomeroomClassesImportExportActions
            exportFilters={{
              search: debouncedSearch || undefined,
              academicYearId: yearFilter,
              gradeLevelId: gradeFilter,
              status: statusFilter,
            }}
            importOpen={importOpen}
            onImportOpenChange={setImportOpen}
            onImportSuccess={() => {
              void queryClient.invalidateQueries({
                queryKey: ['homeroom-classes'],
              });
            }}
          />
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='hc-search'>Tìm kiếm</Label>
              <Input
                id='hc-search'
                placeholder='Mã hoặc tên lớp...'
                value={globalFilter}
                onChange={(e) => {
                  setGlobalFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='hc-year'>Năm học</Label>
              <select
                id='hc-year'
                className={selectClassName}
                value={yearFilter ?? ''}
                onChange={(e) => {
                  setColumnFilters(
                    setColumnFilterValue(
                      columnFilters,
                      'academicYearId',
                      e.target.value || undefined,
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
              <Label htmlFor='hc-grade'>Khối</Label>
              <select
                id='hc-grade'
                className={selectClassName}
                value={gradeFilter ?? ''}
                onChange={(e) => {
                  setColumnFilters(
                    setColumnFilterValue(
                      columnFilters,
                      'gradeLevelId',
                      e.target.value || undefined,
                    ),
                  );
                  setPage(1);
                }}
              >
                <option value=''>Tất cả</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='hc-status'>Trạng thái</Label>
              <select
                id='hc-status'
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
              message='Không tải được danh sách lớp hành chính'
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
                title='Chưa có lớp hành chính'
                description='Tạo lớp hành chính đầu tiên'
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
