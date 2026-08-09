import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { ROUTES } from '@/app/router/routes';
import { CreateAccountFields } from '@/components/common/create-account-fields';
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
  createParent,
  fetchParents,
  updateParentStatus,
  type Parent,
} from '@/features/parents/api/parents-api';
import { ParentsImportExportActions } from '@/features/parents/components/parents-import-export-actions';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getApiError } from '@/lib/api';
import {
  buildOptionalAccountPayload,
  createAccountFields,
  refineCreateAccountFields,
} from '@/lib/create-account-schema';
import { getErrorMessage } from '@/lib/error-messages';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { AcademicEntityStatus } from '@/types/api.types';

const PAGE_SIZE = 20;

const createSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Họ tên là bắt buộc'),
    phone: z.string().optional(),
    ...createAccountFields,
  })
  .superRefine(refineCreateAccountFields);

export function ParentsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const listQuery = useQuery({
    queryKey: ['parents', session?.activeSchoolId, debouncedSearch, page],
    queryFn: () => fetchParents({ search: debouncedSearch || undefined, page, limit: PAGE_SIZE }),
    enabled: Boolean(session?.activeSchoolId),
    placeholderData: keepPreviousData,
  });

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof createSchema>>({
      resolver: zodResolver(createSchema),
      defaultValues: { createAccount: false },
    });

  const createAccount = watch('createAccount');

  const createMutation = useMutation({
    mutationFn: createParent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['parents'] });
      toast.success('Tạo phụ huynh thành công');
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
      updateParentStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['parents'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'));
    },
  });

  const columns = useMemo<ColumnDef<Parent>[]>(
    () => [
      {
        accessorKey: 'fullName',
        header: 'Họ tên',
        cell: ({ row }) => (
          <Link to={`${ROUTES.parents}/${row.original.id}`} className='font-medium text-primary hover:underline'>
            {row.original.fullName}
          </Link>
        ),
      },
      { accessorKey: 'userEmail', header: 'Email', cell: ({ row }) => row.original.userEmail ?? '—' },
      { accessorKey: 'phone', header: 'SĐT', cell: ({ row }) => row.original.phone ?? '—' },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
            row.original.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground')}>
            {ACADEMIC_STATUS_LABELS[row.original.status]}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Button variant='outline' size='sm' onClick={() => statusMutation.mutate({
            id: row.original.id,
            status: row.original.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
          })}>
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
          <h1 className='text-2xl font-semibold'>Quản lý phụ huynh</h1>
          <p className='text-sm text-muted-foreground'>Hồ sơ phụ huynh và liên kết con</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Đóng form' : 'Thêm phụ huynh'}</Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader><CardTitle>Tạo hồ sơ phụ huynh</CardTitle></CardHeader>
          <CardContent>
            <form
              className='grid gap-4 md:grid-cols-2'
              onSubmit={handleSubmit((values) =>
                createMutation.mutate({
                  fullName: values.fullName,
                  phone: values.phone || undefined,
                  ...buildOptionalAccountPayload(values),
                }),
              )}
            >
              <div className='space-y-2'>
                <Label>Họ tên</Label>
                <Input {...register('fullName')} />
                {errors.fullName ? <p className='text-sm text-destructive'>{errors.fullName.message}</p> : null}
              </div>
              <div className='space-y-2'>
                <Label>SĐT</Label>
                <Input {...register('phone')} />
              </div>
              <CreateAccountFields
                idPrefix='parent-create'
                createAccount={Boolean(createAccount)}
                register={register}
                errors={errors}
              />
              <div className='md:col-span-2'>
                <Button type='submit' disabled={isSubmitting || createMutation.isPending}>
                  Tạo phụ huynh
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className='flex flex-col gap-4'>
          <div className='flex flex-row flex-wrap items-center justify-between gap-4'>
            <CardTitle>Danh sách</CardTitle>
            <Input className='max-w-xs' placeholder='Tìm tên, email...' value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <ParentsImportExportActions
            exportFilters={{ search: debouncedSearch || undefined }}
            importOpen={importOpen}
            onImportOpenChange={setImportOpen}
            onImportSuccess={() => {
              void queryClient.invalidateQueries({ queryKey: ['parents'] });
            }}
          />
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? <LoadingState /> : null}
          {listQuery.isError ? <ErrorState message='Không tải được danh sách phụ huynh' onRetry={() => void listQuery.refetch()} /> : null}
          {listQuery.isSuccess && items.length === 0 ? <EmptyState title='Chưa có phụ huynh' /> : null}
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
