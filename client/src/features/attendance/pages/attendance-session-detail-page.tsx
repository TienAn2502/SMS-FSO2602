import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AttendanceRecordGrid,
  buildRecordDraft,
} from '@/features/attendance/components/attendance-record-grid';
import { AttendanceSessionStatusBadge } from '@/features/attendance/components/attendance-status-badges';
import { fetchAttendanceSession } from '@/features/attendance/api/attendance-api';
import { formatDateVi } from '@/lib/date-format';

export function AttendanceSessionDetailPage() {
  const { id } = useParams<{ id: string }>();

  const sessionQuery = useQuery({
    queryKey: ['attendance-sessions', id],
    queryFn: () => fetchAttendanceSession(id!),
    enabled: Boolean(id),
  });

  if (sessionQuery.isLoading) return <LoadingState />;
  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <ErrorState
        message='Không tải được chi tiết phiên'
        onRetry={() => void sessionQuery.refetch()}
      />
    );
  }

  const session = sessionQuery.data;
  const draft = buildRecordDraft(session.records);

  return (
    <div className='space-y-6'>
      <div>
        <Link
          to={ROUTES.attendanceSessions}
          className='text-sm text-muted-foreground hover:text-foreground'
        >
          ← Danh sách phiên
        </Link>
        <h1 className='mt-2 text-2xl font-semibold'>
          {session.courseSectionCode} — {formatDateVi(session.sessionDate)} (tiết{' '}
          {session.periodNumber})
        </h1>
        <p className='text-sm text-muted-foreground'>
          GV: {session.teacherFullName} ·{' '}
          <AttendanceSessionStatusBadge status={session.status} /> · {session.recordCount}{' '}
          học sinh
        </p>
        <p className='mt-1 text-sm text-muted-foreground'>
          Chế độ xem — điểm danh do giáo viên thực hiện qua Portal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Bảng điểm danh</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceRecordGrid
            records={session.records}
            draft={draft}
            readonly
            emptyHint='Giáo viên chưa nạp danh sách học sinh cho phiên này.'
            onDraftChange={() => undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
