import { type ColumnDef } from '@tanstack/react-table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { DataTableGrid } from '@/components/common/data-table-grid';
import { DataPagination } from '@/components/common/data-pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchAttendanceSessions,
  type AttendanceSession,
} from '@/features/attendance/api/attendance-api';
import { AttendanceSessionStatusBadge } from '@/features/attendance/components/attendance-status-badges';
import { AttendanceExportActions } from '@/features/attendance/components/attendance-export-actions';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { formatDateVi } from '@/lib/date-format';
import { selectClassName } from '@/lib/form-styles';

const PAGE_SIZE = 20;

export function AttendanceSessionsPage() {
  const { session } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [sessionDateFilter, setSessionDateFilter] = useState('');

  const listQuery = useQuery({
    queryKey: [
      'attendance-sessions',
      session?.activeSchoolId,
      page,
      statusFilter,
      sessionDateFilter,
    ],
    queryFn: () =>
      fetchAttendanceSessions({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(sessionDateFilter ? { sessionDate: sessionDateFilter } : {}),
      }),
    enabled: Boolean(session?.activeSchoolId),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo<ColumnDef<AttendanceSession>[]>(
    () => [
      {
        accessorKey: 'sessionDate',
        header: 'Ngày',
        cell: ({ row }) => formatDateVi(row.original.sessionDate),
      },
      { accessorKey: 'periodNumber', header: 'Tiết' },
      { accessorKey: 'courseSectionCode', header: 'Lớp môn' },
      { accessorKey: 'teacherFullName', header: 'Giáo viên' },
      { accessorKey: 'recordCount', header: 'Số HS' },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <AttendanceSessionStatusBadge status={row.original.status} />
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Link
            to={`${ROUTES.attendanceSessions}/${row.original.id}`}
            className='text-primary hover:underline'
          >
            Xem chi tiết
          </Link>
        ),
      },
    ],
    [],
  );

  if (listQuery.isLoading) return <LoadingState />;
  if (listQuery.isError) {
    return (
      <ErrorState
        message='Không tải được danh sách phiên điểm danh'
        onRetry={() => void listQuery.refetch()}
      />
    );
  }

  const items = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Điểm danh</h1>
        <p className='text-sm text-muted-foreground'>
          Tra cứu phiên điểm danh — giáo viên mở phiên và ghi nhận qua Portal.
        </p>
      </div>

      <Card>
        <CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <CardTitle className='text-base'>Bộ lọc</CardTitle>
          <AttendanceExportActions
            sessionDate={sessionDateFilter || undefined}
            status={statusFilter === 'ALL' ? undefined : statusFilter}
          />
        </CardHeader>
        <CardContent className='flex flex-wrap gap-4'>
          <div className='space-y-1'>
            <Label htmlFor='statusFilter'>Trạng thái</Label>
            <select
              id='statusFilter'
              className={selectClassName}
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value as 'ALL' | 'OPEN' | 'CLOSED');
              }}
            >
              <option value='ALL'>Tất cả</option>
              <option value='OPEN'>Đang điểm danh</option>
              <option value='CLOSED'>Đã đóng</option>
            </select>
          </div>
          <div className='space-y-1'>
            <Label htmlFor='sessionDateFilter'>Ngày</Label>
            <Input
              id='sessionDateFilter'
              type='date'
              value={sessionDateFilter}
              onChange={(event) => {
                setPage(1);
                setSessionDateFilter(event.target.value);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyState title='Chưa có phiên điểm danh' />
      ) : (
        <>
          <DataTableGrid columns={columns} data={items} />
          {meta ? (
            <DataPagination
              page={meta.page}
              totalPages={meta.totalPages}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
