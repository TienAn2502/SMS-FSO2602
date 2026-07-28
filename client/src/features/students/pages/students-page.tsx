import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef, type ColumnFiltersState } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { ROUTES } from '@/app/router/routes';
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
import { fetchHomeroomClasses } from '@/features/homeroom-classes/api/homeroom-classes-api';
import {
  createStudent,
  fetchStudents,
  updateStudentStatus,
  type Student,
} from '@/features/students/api/students-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';
import { ACADEMIC_STATUS_LABELS, GENDER_LABELS } from '@/lib/labels';
import {
  getColumnFilterValue,
  hasColumnFilters,
  setColumnFilterValue,
} from '@/lib/table-filters';
import { cn } from '@/lib/utils';
import type { AcademicEntityStatus } from '@/types/api.types';

const PAGE_SIZE = 20;

const createSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ tên là bắt buộc'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  createAccount: z.boolean().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.createAccount) {
    if (!values.email?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Email là bắt buộc khi tạo tài khoản',
        path: ['email'],
      });
    }
    if (!values.password || values.password.length < 8) {
      ctx.addIssue({
        code: 'custom',
        message: 'Mật khẩu phải có ít nhất 8 ký tự',
        path: ['password'],
      });
    }
  }
});

type CreateFormValues = z.infer<typeof createSchema>;

const STATUS_BADGE: Record<AcademicEntityStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground',
};

export function StudentsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const debouncedSearch = useDebouncedValue(globalFilter, 300);

  const yearFilter = getColumnFilterValue<string>(columnFilters, 'academicYearId');
  const classFilter = getColumnFilterValue<string>(columnFilters, 'homeroomClassId');
  const statusFilter = getColumnFilterValue<AcademicEntityStatus>(
    columnFilters,
    'status',
  );

  const yearsQuery = useQuery({
    queryKey: ['academic-years', session?.activeSchoolId, 'all'],
    queryFn: fetchAllAcademicYears,
    enabled: Boolean(session?.activeSchoolId),
  });

  const classesQuery = useQuery({
    queryKey: [
      'homeroom-classes',
      session?.activeSchoolId,
      'filter',
      yearFilter,
    ],
    queryFn: () =>
      fetchHomeroomClasses({
        academicYearId: yearFilter,
        status: 'ACTIVE',
        limit: 100,
      }),
    enabled: Boolean(session?.activeSchoolId && yearFilter),
  });

  const listQuery = useQuery({
    queryKey: [
      'students',
      session?.activeSchoolId,
      debouncedSearch,
      yearFilter,
      classFilter,
      statusFilter,
      page,
    ],
    queryFn: () =>
      fetchStudents({
        search: debouncedSearch || undefined,
        academicYearId: yearFilter,
        homeroomClassId: classFilter,
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
      fullName: '',
      dateOfBirth: '',
      gender: undefined,
      phone: '',
      address: '',
      createAccount: false,
      email: '',
      password: '',
    },
  });

  const createAccount = watch('createAccount');

  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Tạo hồ sơ học sinh thành công');
      reset();
      setShowForm(false);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Tạo học sinh thất bại'),
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AcademicEntityStatus }) =>
      updateStudentStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
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

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        accessorKey: 'fullName',
        header: 'Họ tên',
        cell: ({ row }) => (
          <Link
            to={`${ROUTES.students}/${row.original.id}`}
            className='font-medium text-primary hover:underline'
          >
            {row.original.fullName}
          </Link>
        ),
      },
      {
        id: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.userEmail ?? '—',
      },
      {
        id: 'class',
        header: 'Lớp hiện tại',
        cell: ({ row }) =>
          row.original.currentEnrollment
            ? `${row.original.currentEnrollment.homeroomClassCode} (${row.original.currentEnrollment.academicYearName})`
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
          <div className='flex gap-2'>
            <Button variant='outline' size='sm' render={<Link to={`${ROUTES.students}/${row.original.id}`} />}>
              Chi tiết
            </Button>
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
          </div>
        ),
      },
    ],
    [handleToggleStatus, statusMutation.isPending],
  );

  const items = listQuery.data?.items ?? [];
  const filtersActive = hasColumnFilters(columnFilters, globalFilter);
  const years = yearsQuery.data?.items ?? [];
  const classes = classesQuery.data?.items ?? [];

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Học sinh</h1>
          <p className='text-sm text-muted-foreground'>
            Quản lý hồ sơ và ghi danh học sinh
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Đóng form' : 'Thêm học sinh'}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Tạo hồ sơ học sinh</CardTitle>
            <CardDescription>
              Có thể tạo kèm tài khoản đăng nhập hoặc chỉ hồ sơ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className='grid gap-4 md:grid-cols-2'
              onSubmit={handleSubmit((values) =>
                createMutation.mutate({
                  fullName: values.fullName,
                  dateOfBirth: values.dateOfBirth || undefined,
                  gender: values.gender,
                  phone: values.phone || undefined,
                  address: values.address || undefined,
                  ...(values.createAccount && values.email && values.password
                    ? {
                        account: {
                          email: values.email,
                          password: values.password,
                        },
                      }
                    : {}),
                }),
              )}
            >
              <div className='space-y-2 md:col-span-2'>
                <Label htmlFor='fullName'>Họ tên</Label>
                <Input id='fullName' {...register('fullName')} />
                {errors.fullName ? (
                  <p className='text-sm text-destructive'>{errors.fullName.message}</p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='dateOfBirth'>Ngày sinh</Label>
                <Input id='dateOfBirth' type='date' {...register('dateOfBirth')} />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='gender'>Giới tính</Label>
                <select id='gender' className={selectClassName} {...register('gender')}>
                  <option value=''>Chưa chọn</option>
                  {(Object.keys(GENDER_LABELS) as Array<keyof typeof GENDER_LABELS>).map(
                    (gender) => (
                      <option key={gender} value={gender}>
                        {GENDER_LABELS[gender]}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='phone'>Số điện thoại</Label>
                <Input id='phone' {...register('phone')} />
              </div>
              <div className='space-y-2 md:col-span-2'>
                <Label htmlFor='address'>Địa chỉ</Label>
                <Input id='address' {...register('address')} />
              </div>
              <div className='flex items-center gap-2 md:col-span-2'>
                <input id='createAccount' type='checkbox' {...register('createAccount')} />
                <Label htmlFor='createAccount'>Tạo tài khoản đăng nhập</Label>
              </div>
              {createAccount ? (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='email'>Email</Label>
                    <Input id='email' type='email' {...register('email')} />
                    {errors.email ? (
                      <p className='text-sm text-destructive'>{errors.email.message}</p>
                    ) : null}
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='password'>Mật khẩu</Label>
                    <Input id='password' type='password' {...register('password')} />
                    {errors.password ? (
                      <p className='text-sm text-destructive'>{errors.password.message}</p>
                    ) : null}
                  </div>
                </>
              ) : null}
              <div className='md:col-span-2'>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting ? 'Đang tạo...' : 'Tạo học sinh'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách học sinh</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='stu-search'>Tìm kiếm</Label>
              <Input
                id='stu-search'
                placeholder='Tên hoặc email...'
                value={globalFilter}
                onChange={(e) => {
                  setGlobalFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='stu-year'>Năm học</Label>
              <select
                id='stu-year'
                className={selectClassName}
                value={yearFilter ?? ''}
                onChange={(e) => {
                  setColumnFilters((prev) => {
                    const next = setColumnFilterValue(
                      prev,
                      'academicYearId',
                      e.target.value || undefined,
                    );
                    return setColumnFilterValue(next, 'homeroomClassId', undefined);
                  });
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
              <Label htmlFor='stu-class'>Lớp HC</Label>
              <select
                id='stu-class'
                className={selectClassName}
                value={classFilter ?? ''}
                disabled={!yearFilter}
                onChange={(e) => {
                  setColumnFilters(
                    setColumnFilterValue(
                      columnFilters,
                      'homeroomClassId',
                      e.target.value || undefined,
                    ),
                  );
                  setPage(1);
                }}
              >
                <option value=''>Tất cả</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='stu-status'>Trạng thái</Label>
              <select
                id='stu-status'
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
              message='Không tải được danh sách học sinh'
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
                title='Chưa có học sinh'
                description='Tạo hồ sơ học sinh đầu tiên'
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
