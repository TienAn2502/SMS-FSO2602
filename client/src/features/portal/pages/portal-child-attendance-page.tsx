import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { DataPagination } from '@/components/common/data-pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AttendanceRecordStatusBadge,
  AttendanceSessionStatusBadge,
} from '@/features/attendance/components/attendance-status-badges';
import { formatDateVi } from '@/lib/date-format';
import {
  fetchMyChildAttendance,
  fetchMyChildren,
  type PortalMyAttendanceItem,
} from '@/features/portal/api/portal-api';

const PAGE_SIZE = 20;

export function PortalChildAttendancePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [page, setPage] = useState(1);

  const childrenQuery = useQuery({
    queryKey: ['portal', 'my-children'],
    queryFn: fetchMyChildren,
  });

  const listQuery = useQuery({
    queryKey: ['portal', 'child-attendance', studentId, page],
    queryFn: () => fetchMyChildAttendance(studentId!, { page, limit: PAGE_SIZE }),
    enabled: Boolean(studentId),
    placeholderData: keepPreviousData,
  });

  if (childrenQuery.isLoading || listQuery.isLoading) return <LoadingState />;
  if (listQuery.isError) {
    return (
      <ErrorState
        message='Không tải được lịch sử điểm danh'
        onRetry={() => void listQuery.refetch()}
      />
    );
  }

  const child = childrenQuery.data?.find((item) => item.student.id === studentId);
  const items = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  return (
    <div className='space-y-6'>
      <div>
        <Link
          to={ROUTES.portalMyChildren}
          className='text-sm text-muted-foreground hover:text-foreground'
        >
          ← Con của tôi
        </Link>
        <h1 className='mt-2 text-2xl font-semibold'>
          Điểm danh — {child?.student.fullName ?? 'Học sinh'}
        </h1>
      </div>

      {items.length === 0 ? (
        <EmptyState title='Chưa có dữ liệu điểm danh' />
      ) : (
        <>
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Tiết</TableHead>
                  <TableHead>Lớp môn</TableHead>
                  <TableHead>Giáo viên</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Phiên</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: PortalMyAttendanceItem) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDateVi(item.sessionDate)}</TableCell>
                    <TableCell>{item.periodNumber}</TableCell>
                    <TableCell>{item.courseSectionCode}</TableCell>
                    <TableCell>{item.teacherFullName}</TableCell>
                    <TableCell>
                      <AttendanceRecordStatusBadge
                        status={item.status as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'}
                      />
                    </TableCell>
                    <TableCell>
                      <AttendanceSessionStatusBadge
                        status={item.sessionStatus as 'OPEN' | 'CLOSED'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
