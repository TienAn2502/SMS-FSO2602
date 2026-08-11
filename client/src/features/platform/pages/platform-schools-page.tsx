import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { getPlatformSchoolDetailPath } from '@/app/router/routes';
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
  createPlatformSchool,
  fetchPlatformSchools,
  updatePlatformSchoolStatus,
  type PlatformSchool,
  type SchoolStatus,
} from '@/features/platform/api/platform-schools-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';
import { SCHOOL_STATUS_LABELS, SCHOOL_TYPE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const createSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Mã trường phải có ít nhất 2 ký tự')
    .max(50)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Mã trường chỉ được chứa chữ, số, gạch ngang và gạch dưới',
    ),
  name: z.string().trim().min(1, 'Tên trường là bắt buộc'),
  shortName: z.string().optional(),
  schoolType: z.enum(['TH', 'THCS', 'THPT']).optional(),
  adminEmail: z.string().email('Email admin không hợp lệ'),
  adminPassword: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  adminFullName: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

const STATUS_BADGE: Record<SchoolStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground',
  SUSPENDED: 'bg-destructive/10 text-destructive',
};

export function PlatformSchoolsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SchoolStatus | ''>('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const listQuery = useQuery({
    queryKey: ['platform-schools', debouncedSearch, statusFilter, page],
    queryFn: () =>
      fetchPlatformSchools({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        limit: PAGE_SIZE,
      }),
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
      code: '',
      name: '',
      shortName: '',
      schoolType: 'THPT',
      adminEmail: '',
      adminPassword: '',
      adminFullName: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: createPlatformSchool,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['platform-schools'] });
      void queryClient.invalidateQueries({ queryKey: ['platform-school-count'] });
      const gradeMessage =
        result.seededGradeLevelCount > 0
          ? ` — đã tạo ${result.seededGradeLevelCount} khối mặc định`
          : '';
      toast.success(`Tạo trường thành công${gradeMessage}`);
      reset();
      setShowForm(false);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Tạo trường thất bại'),
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SchoolStatus }) =>
      updatePlatformSchoolStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-schools'] });
      toast.success('Cập nhật trạng thái trường thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'),
      );
    },
  });

  const handleToggleStatus = useCallback(
    (school: PlatformSchool) => {
      const nextStatus: SchoolStatus =
        school.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

      statusMutation.mutate({ id: school.id, status: nextStatus });
    },
    [statusMutation],
  );

  const columns = useMemo<ColumnDef<PlatformSchool>[]>(
    () => [
      { accessorKey: 'code', header: 'Mã trường' },
      { accessorKey: 'name', header: 'Tên trường' },
      {
        accessorKey: 'schoolType',
        header: 'Loại',
        cell: ({ row }) =>
          row.original.schoolType
            ? SCHOOL_TYPE_LABELS[row.original.schoolType]
            : '—',
      },
      {
        id: 'adminEmail',
        header: 'Admin trường',
        cell: ({ row }) => row.original.adminSummary?.email ?? '—',
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
            {SCHOOL_STATUS_LABELS[row.original.status]}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className='sr-only'>Thao tác</span>,
        cell: ({ row }) => {
          return (
            <Button
              variant='outline'
              size='sm'
              disabled={statusMutation.isPending}
              onClick={(event) => {
                event.stopPropagation();
                handleToggleStatus(row.original);
              }}
            >
              {row.original.status === 'ACTIVE' ? 'Tạm khóa' : 'Kích hoạt'}
            </Button>
          );
        },
      },
    ],
    [handleToggleStatus, statusMutation.isPending],
  );

  const items = listQuery.data?.items ?? [];
  const filtersActive = Boolean(debouncedSearch.trim() || statusFilter);

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Quản lý trường</h1>
          <p className='text-sm text-muted-foreground'>
            Danh sách tenant trên nền tảng SaaS
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Đóng form' : 'Tạo trường mới'}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Tạo trường mới</CardTitle>
            <CardDescription>
              Tạo tenant và tài khoản quản trị trường đầu tiên
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className='grid gap-4 md:grid-cols-2'
              onSubmit={handleSubmit((values) =>
                createMutation.mutate({
                  code: values.code,
                  name: values.name,
                  shortName: values.shortName || undefined,
                  schoolType: values.schoolType,
                  adminEmail: values.adminEmail,
                  adminPassword: values.adminPassword,
                  adminFullName: values.adminFullName || undefined,
                }),
              )}
            >
              <div className='space-y-2'>
                <Label htmlFor='code'>Mã trường</Label>
                <Input id='code' {...register('code')} placeholder='SCHOOL_B' />
                {errors.code ? (
                  <p className='text-sm text-destructive'>{errors.code.message}</p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='name'>Tên trường</Label>
                <Input id='name' {...register('name')} placeholder='Trường THCS B' />
                {errors.name ? (
                  <p className='text-sm text-destructive'>{errors.name.message}</p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='shortName'>Tên viết tắt</Label>
                <Input id='shortName' {...register('shortName')} placeholder='THCS B' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='schoolType'>Loại trường</Label>
                <select id='schoolType' className={selectClassName} {...register('schoolType')}>
                  <option value='TH'>Tiểu học</option>
                  <option value='THCS'>THCS</option>
                  <option value='THPT'>THPT</option>
                </select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='adminEmail'>Email admin trường</Label>
                <Input
                  id='adminEmail'
                  type='email'
                  {...register('adminEmail')}
                  placeholder='admin_b@school.edu.vn'
                />
                {errors.adminEmail ? (
                  <p className='text-sm text-destructive'>
                    {errors.adminEmail.message}
                  </p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='adminPassword'>Mật khẩu admin</Label>
                <Input
                  id='adminPassword'
                  type='password'
                  {...register('adminPassword')}
                  placeholder='Tối thiểu 8 ký tự'
                />
                {errors.adminPassword ? (
                  <p className='text-sm text-destructive'>
                    {errors.adminPassword.message}
                  </p>
                ) : null}
              </div>
              <div className='space-y-2 md:col-span-2'>
                <Label htmlFor='adminFullName'>Họ tên admin (tuỳ chọn)</Label>
                <Input
                  id='adminFullName'
                  {...register('adminFullName')}
                  placeholder='Nguyễn Văn Admin'
                />
              </div>
              <div className='md:col-span-2'>
                <Button type='submit' disabled={isSubmitting || createMutation.isPending}>
                  {createMutation.isPending ? 'Đang tạo…' : 'Tạo trường'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách trường</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex flex-wrap gap-3'>
            <Input
              className='max-w-xs'
              placeholder='Tìm theo mã hoặc tên…'
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <select
              className={selectClassName}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as SchoolStatus | '');
                setPage(1);
              }}
            >
              <option value=''>Tất cả trạng thái</option>
              <option value='ACTIVE'>Hoạt động</option>
              <option value='INACTIVE'>Ngưng hoạt động</option>
              <option value='SUSPENDED'>Tạm khóa</option>
            </select>
          </div>

          {listQuery.isLoading ? (
            <LoadingState message='Đang tải danh sách trường…' />
          ) : null}
          {listQuery.isError ? (
            <ErrorState
              message='Không tải được danh sách trường'
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}

          {!listQuery.isLoading && !listQuery.isError && items.length === 0 ? (
            <EmptyState
              title={filtersActive ? 'Không có trường phù hợp' : 'Chưa có trường nào'}
              description={
                filtersActive
                  ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm'
                  : 'Tạo trường đầu tiên bằng nút phía trên'
              }
            />
          ) : null}

          {!listQuery.isLoading && !listQuery.isError && items.length > 0 ? (
            <>
              <DataTableGrid
                columns={columns}
                data={items}
                getRowHref={(school) => getPlatformSchoolDetailPath(school.id)}
              />
              <DataPagination
                page={page}
                totalPages={listQuery.data?.meta.totalPages ?? 1}
                onPageChange={setPage}
              />
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
