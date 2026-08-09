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
  createAcademicYear,
  fetchAcademicYears,
  setAcademicYearCurrent,
  updateAcademicYearStatus,
  type AcademicYear,
} from '@/features/academic-years/api/academic-years-api';
import { getApiError } from '@/lib/api';
import { formatDateRangeVi } from '@/lib/date-format';
import { getErrorMessage } from '@/lib/error-messages';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { AcademicEntityStatus } from '@/types/api.types';

const PAGE_SIZE = 20;

const createYearSchema = z
  .object({
    name: z.string().trim().min(1, 'Tên năm học là bắt buộc'),
    code: z.string().trim().min(1, 'Mã năm học là bắt buộc'),
    startDate: z.string().min(1, 'Ngày bắt đầu là bắt buộc'),
    endDate: z.string().min(1, 'Ngày kết thúc là bắt buộc'),
  })
  .superRefine((v, ctx) => {
    if (v.endDate <= v.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ngày kết thúc phải sau ngày bắt đầu',
        path: ['endDate'],
      });
    }
  });

type CreateYearValues = z.infer<typeof createYearSchema>;

const STATUS_BADGE: Record<AcademicEntityStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground',
};

export function AcademicYearsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showYearForm, setShowYearForm] = useState(false);

  const yearsQuery = useQuery({
    queryKey: ['academic-years', session?.activeSchoolId, page],
    queryFn: () => fetchAcademicYears({ page, limit: PAGE_SIZE }),
    enabled: Boolean(session?.activeSchoolId),
    placeholderData: keepPreviousData,
  });

  const yearForm = useForm<CreateYearValues>({
    resolver: zodResolver(createYearSchema),
    defaultValues: {
      name: '',
      code: '',
      startDate: '',
      endDate: '',
    },
  });

  const invalidateYears = () => {
    void queryClient.invalidateQueries({ queryKey: ['academic-years'] });
  };

  const createYearMutation = useMutation({
    mutationFn: createAcademicYear,
    onSuccess: () => {
      invalidateYears();
      toast.success('Tạo năm học thành công');
      yearForm.reset();
      setShowYearForm(false);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Tạo năm học thất bại'),
      );
    },
  });

  const setYearCurrentMutation = useMutation({
    mutationFn: setAcademicYearCurrent,
    onSuccess: () => {
      invalidateYears();
      void queryClient.invalidateQueries({ queryKey: ['semesters'] });
      toast.success('Đặt năm học hiện hành thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Thất bại'));
    },
  });

  const yearStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AcademicEntityStatus }) =>
      updateAcademicYearStatus(id, status),
    onSuccess: () => {
      invalidateYears();
      toast.success('Cập nhật trạng thái năm học thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Thất bại'));
    },
  });

  const yearColumns = useMemo<ColumnDef<AcademicYear>[]>(
    () => [
      { accessorKey: 'name', header: 'Tên năm học' },
      { accessorKey: 'code', header: 'Mã' },
      {
        id: 'dates',
        header: 'Thời gian',
        cell: ({ row }) =>
          formatDateRangeVi(row.original.startDate, row.original.endDate),
      },
      {
        accessorKey: 'isCurrent',
        header: 'Hiện hành',
        cell: ({ row }) =>
          row.original.isCurrent ? (
            <span className='rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
              Năm hiện tại
            </span>
          ) : (
            <span className='text-xs text-muted-foreground'>—</span>
          ),
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
        cell: ({ row }) => {
          const year = row.original;
          return (
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                size='sm'
                render={<Link to={`${ROUTES.academicYears}/${year.id}`} />}
              >
                Chi tiết
              </Button>
              {!year.isCurrent ? (
                <Button
                  variant='outline'
                  size='sm'
                  disabled={setYearCurrentMutation.isPending}
                  onClick={() => setYearCurrentMutation.mutate(year.id)}
                >
                  Đặt hiện hành
                </Button>
              ) : null}
              <Button
                variant='outline'
                size='sm'
                disabled={yearStatusMutation.isPending}
                onClick={() =>
                  yearStatusMutation.mutate({
                    id: year.id,
                    status: year.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                  })
                }
              >
                {year.status === 'ACTIVE' ? 'Ngưng' : 'Kích hoạt'}
              </Button>
            </div>
          );
        },
      },
    ],
    [setYearCurrentMutation, yearStatusMutation],
  );

  const years = yearsQuery.data?.items ?? [];

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Năm học</h1>
          <p className='text-sm text-muted-foreground'>
            Quản lý năm học của trường — chọn Chi tiết để quản lý học kỳ
          </p>
        </div>
        <Button onClick={() => setShowYearForm((v) => !v)}>
          {showYearForm ? 'Đóng form' : 'Thêm năm học'}
        </Button>
      </div>

      {showYearForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Tạo năm học mới</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className='grid gap-4 md:grid-cols-2'
              onSubmit={yearForm.handleSubmit((values) =>
                createYearMutation.mutate(values),
              )}
            >
              <div className='space-y-2'>
                <Label htmlFor='year-name'>Tên năm học</Label>
                <Input id='year-name' {...yearForm.register('name')} placeholder='2025-2026' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='year-code'>Mã</Label>
                <Input id='year-code' {...yearForm.register('code')} placeholder='2025-26' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='year-start'>Ngày bắt đầu</Label>
                <Input id='year-start' type='date' {...yearForm.register('startDate')} />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='year-end'>Ngày kết thúc</Label>
                <Input id='year-end' type='date' {...yearForm.register('endDate')} />
              </div>
              <div className='md:col-span-2'>
                <Button type='submit' disabled={createYearMutation.isPending}>
                  {createYearMutation.isPending ? 'Đang tạo...' : 'Tạo năm học'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách năm học</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {yearsQuery.isError ? (
            <ErrorState
              message='Không tải được danh sách năm học'
              onRetry={() => void yearsQuery.refetch()}
            />
          ) : null}

          <div className='relative rounded-lg border border-border'>
            {yearsQuery.isFetching && !yearsQuery.isLoading ? (
              <div className='absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]'>
                <LoadingState message='Đang tải dữ liệu...' />
              </div>
            ) : null}

            {yearsQuery.isLoading ? (
              <LoadingState message='Đang tải danh sách...' />
            ) : years.length === 0 ? (
              <EmptyState
                title='Chưa có năm học'
                description='Thêm năm học đầu tiên'
              />
            ) : (
              <DataTableGrid data={years} columns={yearColumns} />
            )}
          </div>

          {!yearsQuery.isLoading && years.length > 0 ? (
            <DataPagination
              page={yearsQuery.data?.meta.page ?? page}
              totalPages={yearsQuery.data?.meta.totalPages ?? 1}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
