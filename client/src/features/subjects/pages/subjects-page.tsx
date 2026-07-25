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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  createSubject,
  fetchSubjects,
  updateSubjectStatus,
  type Subject,
} from '@/features/subjects/api/subjects-api';
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
  code: z.string().trim().min(1, 'Mã môn là bắt buộc'),
  name: z.string().trim().min(1, 'Tên môn là bắt buộc'),
  description: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

const STATUS_BADGE: Record<AcademicEntityStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground',
};

export function SubjectsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const debouncedSearch = useDebouncedValue(globalFilter, 300);
  const statusFilter = getColumnFilterValue<AcademicEntityStatus>(
    columnFilters,
    'status',
  );

  const listQuery = useQuery({
    queryKey: [
      'subjects',
      session?.activeSchoolId,
      debouncedSearch,
      statusFilter,
      page,
    ],
    queryFn: () =>
      fetchSubjects({
        search: debouncedSearch || undefined,
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
    defaultValues: { code: '', name: '', description: '' },
  });

  const createMutation = useMutation({
    mutationFn: createSubject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Tạo môn học thành công');
      reset();
      setShowForm(false);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Tạo môn thất bại'),
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AcademicEntityStatus }) =>
      updateSubjectStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'),
      );
    },
  });

  const handleToggleStatus = useCallback(
    (id: string, status: AcademicEntityStatus) => {
      statusMutation.mutate({ id, status });
    },
    [statusMutation],
  );

  const columns = useMemo<ColumnDef<Subject>[]>(
    () => [
      { accessorKey: 'code', header: 'Mã môn' },
      { accessorKey: 'name', header: 'Tên môn' },
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
    [handleToggleStatus, statusMutation.isPending],
  );

  const items = listQuery.data?.items ?? [];
  const filtersActive = hasColumnFilters(columnFilters, globalFilter);

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Quản lý môn học</h1>
          <p className='text-sm text-muted-foreground'>
            Danh mục môn học trong trường
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Đóng form' : 'Thêm môn'}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Tạo môn học mới</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className='grid gap-4 md:grid-cols-2'
              onSubmit={handleSubmit((values) => createMutation.mutate(values))}
            >
              <div className='space-y-2'>
                <Label htmlFor='code'>Mã môn</Label>
                <Input id='code' {...register('code')} placeholder='TOAN' />
                {errors.code ? (
                  <p className='text-sm text-destructive'>{errors.code.message}</p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='name'>Tên môn</Label>
                <Input id='name' {...register('name')} placeholder='Toán học' />
                {errors.name ? (
                  <p className='text-sm text-destructive'>{errors.name.message}</p>
                ) : null}
              </div>
              <div className='space-y-2 md:col-span-2'>
                <Label htmlFor='description'>Mô tả (tuỳ chọn)</Label>
                <Input id='description' {...register('description')} />
              </div>
              <div className='md:col-span-2'>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting ? 'Đang tạo...' : 'Tạo môn học'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách môn học</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='subject-search'>Tìm kiếm</Label>
              <Input
                id='subject-search'
                placeholder='Mã hoặc tên môn...'
                value={globalFilter}
                onChange={(e) => {
                  setGlobalFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='subject-status'>Trạng thái</Label>
              <select
                id='subject-status'
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
              message='Không tải được danh sách môn học'
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
                title='Chưa có môn học'
                description='Thêm môn học đầu tiên cho trường'
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
