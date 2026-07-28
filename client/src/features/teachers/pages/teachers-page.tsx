import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  createTeacher,
  fetchTeachers,
  updateTeacherStatus,
  type Teacher,
} from '@/features/teachers/api/teachers-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { AcademicEntityStatus } from '@/types/api.types';

const PAGE_SIZE = 20;

const createSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ tên là bắt buộc'),
  specialization: z.string().optional(),
  phone: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

const STATUS_BADGE: Record<AcademicEntityStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground',
};

export function TeachersPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const listQuery = useQuery({
    queryKey: ['teachers', session?.activeSchoolId, debouncedSearch, page],
    queryFn: () =>
      fetchTeachers({ search: debouncedSearch || undefined, page, limit: PAGE_SIZE }),
    enabled: Boolean(session?.activeSchoolId),
    placeholderData: keepPreviousData,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CreateFormValues>({ resolver: zodResolver(createSchema) });

  const createMutation = useMutation({
    mutationFn: createTeacher,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Tạo giáo viên thành công');
      reset();
      setShowForm(false);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Tạo thất bại'));
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AcademicEntityStatus }) =>
      updateTeacherStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'));
    },
  });

  const columns = useMemo<ColumnDef<Teacher>[]>(
    () => [
      {
        accessorKey: 'fullName',
        header: 'Họ tên',
        cell: ({ row }) => (
          <Link
            to={`${ROUTES.teachers}/${row.original.id}`}
            className='font-medium text-primary hover:underline'
          >
            {row.original.fullName}
          </Link>
        ),
      },
      { accessorKey: 'userEmail', header: 'Email', cell: ({ row }) => row.original.userEmail ?? '—' },
      { accessorKey: 'specialization', header: 'Chuyên môn', cell: ({ row }) => row.original.specialization ?? '—' },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium', STATUS_BADGE[row.original.status])}>
            {ACADEMIC_STATUS_LABELS[row.original.status]}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Button
            variant='outline'
            size='sm'
            onClick={() =>
              statusMutation.mutate({
                id: row.original.id,
                status: row.original.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
              })
            }
          >
            {row.original.status === 'ACTIVE' ? 'Ngưng' : 'Kích hoạt'}
          </Button>
        ),
      },
    ],
    [statusMutation],
  );

  const items = listQuery.data?.items ?? [];

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Quản lý giáo viên</h1>
          <p className='text-sm text-muted-foreground'>Hồ sơ và tài khoản giáo viên</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Đóng form' : 'Thêm giáo viên'}</Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader><CardTitle>Tạo hồ sơ giáo viên</CardTitle></CardHeader>
          <CardContent>
            <form className='grid gap-4 md:grid-cols-2' onSubmit={handleSubmit((v) => createMutation.mutate(v))}>
              <div className='space-y-2'>
                <Label htmlFor='fullName'>Họ tên</Label>
                <Input id='fullName' {...register('fullName')} />
                {errors.fullName ? <p className='text-sm text-destructive'>{errors.fullName.message}</p> : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='specialization'>Chuyên môn</Label>
                <Input id='specialization' {...register('specialization')} />
              </div>
              <div className='md:col-span-2'>
                <Button type='submit' disabled={isSubmitting || createMutation.isPending}>Lưu</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-4'>
          <CardTitle>Danh sách</CardTitle>
          <Input className='max-w-xs' placeholder='Tìm tên, email...' value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? <LoadingState /> : null}
          {listQuery.isError ? <ErrorState message='Không tải được danh sách giáo viên' onRetry={() => void listQuery.refetch()} /> : null}
          {listQuery.isSuccess && items.length === 0 ? <EmptyState title='Chưa có giáo viên' /> : null}
          {listQuery.isSuccess && items.length > 0 ? (
            <>
              <DataTableGrid columns={columns} data={items} />
              <DataPagination page={page} totalPages={listQuery.data.meta.totalPages} onPageChange={setPage} />
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
