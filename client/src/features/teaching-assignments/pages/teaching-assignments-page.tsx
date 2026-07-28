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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchCourseSections } from '@/features/course-sections/api/course-sections-api';
import { fetchAllTeachers } from '@/features/teachers/api/teachers-api';
import {
  createTeachingAssignment,
  fetchTeachingAssignments,
  updateTeachingAssignmentStatus,
  type TeachingAssignment,
} from '@/features/teaching-assignments/api/teaching-assignments-api';
import { formatDateVi } from '@/lib/date-format';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const createSchema = z.object({
  teacherId: z.string().uuid('Chọn giáo viên'),
  courseSectionId: z.string().uuid('Chọn lớp môn'),
  assignAt: z.string().min(1, 'Chọn ngày phân công'),
});

export function TeachingAssignmentsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const listQuery = useQuery({
    queryKey: ['teaching-assignments', session?.activeSchoolId, page],
    queryFn: () => fetchTeachingAssignments({ page, limit: PAGE_SIZE }),
    enabled: Boolean(session?.activeSchoolId),
    placeholderData: keepPreviousData,
  });

  const teachersQuery = useQuery({
    queryKey: ['teachers', session?.activeSchoolId, 'all'],
    queryFn: fetchAllTeachers,
    enabled: Boolean(session?.activeSchoolId && showForm),
  });

  const sectionsQuery = useQuery({
    queryKey: ['course-sections', session?.activeSchoolId, 'all'],
    queryFn: () => fetchCourseSections({ limit: 100, status: 'ACTIVE' }),
    enabled: Boolean(session?.activeSchoolId && showForm),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof createSchema>>({
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
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Phân công thất bại'));
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
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'));
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
          <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
            row.original.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground')}>
            {ACADEMIC_STATUS_LABELS[row.original.status]}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) =>
          row.original.status === 'ACTIVE' ? (
            <Button variant='outline' size='sm' onClick={() => statusMutation.mutate(row.original.id)}>
              Kết thúc
            </Button>
          ) : null,
      },
    ],
    [statusMutation],
  );

  const items = listQuery.data?.items ?? [];

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Phân công giảng dạy</h1>
          <p className='text-sm text-muted-foreground'>Gán giáo viên dạy lớp môn (học kỳ hiện hành)</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Đóng form' : 'Thêm phân công'}</Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader><CardTitle>Phân công mới</CardTitle></CardHeader>
          <CardContent>
            <form className='grid gap-4 md:grid-cols-2' onSubmit={handleSubmit((v) => createMutation.mutate(v))}>
              <div className='space-y-2'>
                <Label>Giáo viên</Label>
                <select className={selectClassName} {...register('teacherId')}>
                  <option value=''>— Chọn —</option>
                  {teachersQuery.data?.map((t) => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
                {errors.teacherId ? <p className='text-sm text-destructive'>{errors.teacherId.message}</p> : null}
              </div>
              <div className='space-y-2'>
                <Label>Lớp môn</Label>
                <select className={selectClassName} {...register('courseSectionId')}>
                  <option value=''>— Chọn —</option>
                  {sectionsQuery.data?.items.map((s) => (
                    <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                  ))}
                </select>
                {errors.courseSectionId ? <p className='text-sm text-destructive'>{errors.courseSectionId.message}</p> : null}
              </div>
              <div className='space-y-2'>
                <Label>Ngày phân công</Label>
                <input type='date' className={selectClassName} {...register('assignAt')} />
              </div>
              <div className='flex items-end'>
                <Button type='submit' disabled={isSubmitting || createMutation.isPending}>Lưu</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Danh sách</CardTitle></CardHeader>
        <CardContent>
          {listQuery.isLoading ? <LoadingState /> : null}
          {listQuery.isError ? <ErrorState message='Không tải được phân công' onRetry={() => void listQuery.refetch()} /> : null}
          {listQuery.isSuccess && items.length === 0 ? <EmptyState title='Chưa có phân công' /> : null}
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
