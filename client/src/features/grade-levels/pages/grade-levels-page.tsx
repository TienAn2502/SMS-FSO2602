import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
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
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  createGradeLevel,
  fetchGradeLevels,
  type GradeLevel,
} from '@/features/grade-levels/api/grade-levels-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

const PAGE_SIZE = 20;

const createSchema = z.object({
  name: z.string().trim().min(1, 'Tên khối là bắt buộc'),
  code: z.string().trim().min(1, 'Mã khối là bắt buộc'),
});

type CreateFormValues = z.infer<typeof createSchema>;

export function GradeLevelsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const listQuery = useQuery({
    queryKey: ['grade-levels', session?.activeSchoolId, debouncedSearch, page],
    queryFn: () =>
      fetchGradeLevels({
        search: debouncedSearch || undefined,
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
    defaultValues: { name: '', code: '' },
  });

  const createMutation = useMutation({
    mutationFn: createGradeLevel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['grade-levels'] });
      toast.success('Tạo khối thành công');
      reset();
      setShowForm(false);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Tạo khối thất bại'),
      );
    },
  });

  const columns = useMemo<ColumnDef<GradeLevel>[]>(
    () => [
      { accessorKey: 'code', header: 'Mã khối' },
      { accessorKey: 'name', header: 'Tên khối' },
    ],
    [],
  );

  const items = listQuery.data?.items ?? [];
  const filtersActive = Boolean(debouncedSearch.trim());

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Quản lý khối</h1>
          <p className='text-sm text-muted-foreground'>
            Danh mục khối trong trường {session?.activeSchool?.name}
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Đóng form' : 'Thêm khối'}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Tạo khối mới</CardTitle>
            <CardDescription>Ví dụ: Khối 10, mã 10</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className='grid gap-4 md:grid-cols-2'
              onSubmit={handleSubmit((values) => createMutation.mutate(values))}
            >
              <div className='space-y-2'>
                <Label htmlFor='code'>Mã khối</Label>
                <Input id='code' {...register('code')} placeholder='10' />
                {errors.code ? (
                  <p className='text-sm text-destructive'>{errors.code.message}</p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='name'>Tên khối</Label>
                <Input id='name' {...register('name')} placeholder='Khối 10' />
                {errors.name ? (
                  <p className='text-sm text-destructive'>{errors.name.message}</p>
                ) : null}
              </div>
              <div className='md:col-span-2'>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting ? 'Đang tạo...' : 'Tạo khối'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách khối</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='max-w-sm space-y-1.5'>
            <Label htmlFor='grade-search'>Tìm kiếm</Label>
            <Input
              id='grade-search'
              placeholder='Mã hoặc tên khối...'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {listQuery.isError ? (
            <ErrorState
              message='Không tải được danh sách khối'
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
                title='Chưa có khối'
                description='Thêm khối đầu tiên cho trường'
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
