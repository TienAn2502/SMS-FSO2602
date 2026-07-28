import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AttendanceRecordGrid,
  buildRecordDraft,
  recordsToBulkPayload,
  type RecordDraft,
} from '@/features/attendance/components/attendance-record-grid';
import { AttendanceSessionStatusBadge } from '@/features/attendance/components/attendance-status-badges';
import {
  bulkUpsertPortalAttendanceRecords,
  closePortalAttendanceSession,
  createPortalAttendanceSession,
  fetchMyAttendanceClasses,
  fetchPortalAttendanceSession,
} from '@/features/portal/api/portal-api';
import { formatDateVi } from '@/lib/date-format';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';

export function PortalAttendancePage() {
  const queryClient = useQueryClient();
  const [courseSectionId, setCourseSectionId] = useState('');
  const [sessionDate, setSessionDate] = useState('2025-09-01');
  const [periodNumber, setPeriodNumber] = useState(1);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecordDraft>({});

  const classesQuery = useQuery({
    queryKey: ['portal', 'my-attendance-classes'],
    queryFn: fetchMyAttendanceClasses,
  });

  const sessionQuery = useQuery({
    queryKey: ['portal', 'attendance-sessions', activeSessionId],
    queryFn: () => fetchPortalAttendanceSession(activeSessionId!),
    enabled: Boolean(activeSessionId),
  });

  useEffect(() => {
    if (sessionQuery.data?.records) {
      setDraft(buildRecordDraft(sessionQuery.data.records));
    }
  }, [sessionQuery.data]);

  const createMutation = useMutation({
    mutationFn: async (input: {
      courseSectionId: string;
      sessionDate: string;
      periodNumber: number;
    }) => {
      const session = await createPortalAttendanceSession(input);
      return bulkUpsertPortalAttendanceRecords(session.id, {
        records: [],
        initMissingStudents: true,
      });
    },
    onSuccess: (session) => {
      setActiveSessionId(session.id);
      setDraft(buildRecordDraft(session.records));
      queryClient.setQueryData(['portal', 'attendance-sessions', session.id], session);
      toast.success('Đã mở phiên và nạp danh sách học sinh lớp');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Tạo phiên thất bại'));
    },
  });

  const reloadStudentsMutation = useMutation({
    mutationFn: () =>
      bulkUpsertPortalAttendanceRecords(activeSessionId!, {
        records: [],
        initMissingStudents: true,
      }),
    onSuccess: (data) => {
      setDraft(buildRecordDraft(data.records));
      queryClient.setQueryData(['portal', 'attendance-sessions', activeSessionId], data);
      toast.success('Đã nạp lại danh sách học sinh lớp');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Nạp danh sách thất bại'));
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      bulkUpsertPortalAttendanceRecords(activeSessionId!, {
        records: recordsToBulkPayload(draft),
        initMissingStudents: true,
      }),
    onSuccess: (data) => {
      setDraft(buildRecordDraft(data.records));
      queryClient.setQueryData(['portal', 'attendance-sessions', activeSessionId], data);
      toast.success('Lưu điểm danh thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Lưu thất bại'));
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closePortalAttendanceSession(activeSessionId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['portal', 'attendance-sessions', activeSessionId],
      });
      toast.success('Đã đóng phiên điểm danh');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Đóng phiên thất bại'));
    },
  });

  if (classesQuery.isLoading) return <LoadingState />;
  if (classesQuery.isError) {
    return (
      <ErrorState
        message='Không tải được lớp môn'
        onRetry={() => void classesQuery.refetch()}
      />
    );
  }

  const classes = classesQuery.data ?? [];
  const session = sessionQuery.data;
  const isClosed = session?.status === 'CLOSED';
  const hasRecords = (session?.records.length ?? 0) > 0;

  return (
    <div className='space-y-6'>
      <div>
        <Link to={ROUTES.portal} className='text-sm text-muted-foreground hover:text-foreground'>
          ← Portal
        </Link>
        <h1 className='mt-2 text-2xl font-semibold'>Điểm danh lớp môn</h1>
        <p className='text-sm text-muted-foreground'>
          Mở phiên theo lớp môn được phân công — hệ thống tự nạp học sinh ghi danh ACTIVE.
        </p>
      </div>

      {!activeSessionId ? (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Mở phiên điểm danh</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-1 md:col-span-2'>
              <Label>Lớp môn</Label>
              <select
                className={selectClassName}
                value={courseSectionId}
                onChange={(event) => setCourseSectionId(event.target.value)}
              >
                <option value=''>— Chọn lớp môn —</option>
                {classes.map((item) => (
                  <option key={item.courseSectionId} value={item.courseSectionId}>
                    {item.courseSectionCode} — {item.courseSectionName}
                    {item.homeroomClassCode ? ` (${item.homeroomClassCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1'>
              <Label>Ngày</Label>
              <Input
                type='date'
                value={sessionDate}
                onChange={(event) => setSessionDate(event.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Tiết</Label>
              <Input
                type='number'
                min={1}
                max={12}
                value={periodNumber}
                onChange={(event) => setPeriodNumber(Number(event.target.value))}
              />
            </div>
            <div className='md:col-span-2'>
              <Button
                disabled={!courseSectionId || createMutation.isPending}
                onClick={() =>
                  createMutation.mutate({
                    courseSectionId,
                    sessionDate,
                    periodNumber,
                  })
                }
              >
                Mở phiên và nạp danh sách HS
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeSessionId && sessionQuery.isLoading ? <LoadingState /> : null}

      {session ? (
        <Card>
          <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-2'>
            <div>
              <CardTitle className='text-base'>
                {session.courseSectionCode} — {formatDateVi(session.sessionDate)} (tiết{' '}
                {session.periodNumber})
              </CardTitle>
              <p className='mt-1 text-sm text-muted-foreground'>
                <AttendanceSessionStatusBadge status={session.status} />
                {' · '}
                {session.recordCount} học sinh
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              {!hasRecords && !isClosed ? (
                <Button
                  variant='outline'
                  onClick={() => reloadStudentsMutation.mutate()}
                  disabled={reloadStudentsMutation.isPending}
                >
                  Nạp danh sách HS lớp
                </Button>
              ) : null}
              {!isClosed ? (
                <>
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !hasRecords}
                  >
                    Lưu điểm danh
                  </Button>
                  <Button
                    variant='secondary'
                    onClick={() => closeMutation.mutate()}
                    disabled={closeMutation.isPending}
                  >
                    Đóng phiên
                  </Button>
                </>
              ) : null}
              <Button variant='ghost' onClick={() => setActiveSessionId(null)}>
                Phiên khác
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AttendanceRecordGrid
              records={session.records}
              draft={draft}
              readonly={isClosed}
              emptyHint='Chưa có học sinh trong phiên. Nhấn "Nạp danh sách HS lớp" để lấy học sinh ghi danh ACTIVE.'
              onDraftChange={(studentId, patch) => {
                setDraft((current) => {
                  const existing = current[studentId] ?? {
                    status: 'PRESENT' as const,
                    note: '',
                  };
                  return {
                    ...current,
                    [studentId]: { ...existing, ...patch },
                  };
                });
              }}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
