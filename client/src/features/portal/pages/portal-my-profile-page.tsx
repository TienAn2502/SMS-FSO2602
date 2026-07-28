import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchMyClassTimetable,
  fetchMyStudentProfile,
} from '@/features/portal/api/portal-api';
import { ClassTimetableGrid } from '@/features/timetable/components/class-timetable-grid';
import { formatDateVi } from '@/lib/date-format';
import { ACADEMIC_STATUS_LABELS, ENROLLMENT_STATUS_LABELS, GENDER_LABELS } from '@/lib/labels';

export function PortalMyProfilePage() {
  const profileQuery = useQuery({
    queryKey: ['portal', 'my-student-profile'],
    queryFn: fetchMyStudentProfile,
  });

  const timetableQuery = useQuery({
    queryKey: ['portal', 'my-class-timetable'],
    queryFn: () => fetchMyClassTimetable(),
    enabled: Boolean(profileQuery.data?.currentEnrollment),
  });

  if (profileQuery.isLoading) return <LoadingState />;
  if (profileQuery.isError || !profileQuery.data) {
    return <ErrorState message='Không tải được hồ sơ' onRetry={() => void profileQuery.refetch()} />;
  }

  const student = profileQuery.data;
  const enrollment = student.currentEnrollment;
  const timetable = timetableQuery.data;

  return (
    <div className='space-y-6'>
      <div>
        <Link to={ROUTES.portal} className='text-sm text-muted-foreground hover:text-foreground'>← Portal</Link>
        <h1 className='mt-2 text-2xl font-semibold'>Hồ sơ của tôi</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Thông tin cá nhân</CardTitle></CardHeader>
        <CardContent className='grid gap-2 text-sm md:grid-cols-2'>
          <p><span className='text-muted-foreground'>Họ tên:</span> {student.fullName}</p>
          <p><span className='text-muted-foreground'>Email:</span> {student.userEmail ?? '—'}</p>
          <p><span className='text-muted-foreground'>Ngày sinh:</span> {formatDateVi(student.dateOfBirth)}</p>
          <p><span className='text-muted-foreground'>Giới tính:</span> {student.gender ? GENDER_LABELS[student.gender] : '—'}</p>
          <p><span className='text-muted-foreground'>Trạng thái:</span> {ACADEMIC_STATUS_LABELS[student.status]}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lớp hiện tại</CardTitle></CardHeader>
        <CardContent>
          {enrollment ? (
            <div className='grid gap-2 text-sm md:grid-cols-2'>
              <p><span className='text-muted-foreground'>Lớp HC:</span> {enrollment.homeroomClassCode}</p>
              <p><span className='text-muted-foreground'>Học kỳ:</span> {enrollment.semesterName}</p>
              <p><span className='text-muted-foreground'>Năm học:</span> {enrollment.academicYearName}</p>
              <p><span className='text-muted-foreground'>Ghi danh:</span> {ENROLLMENT_STATUS_LABELS[enrollment.status]}</p>
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>Chưa có ghi danh ACTIVE.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thời khóa biểu lớp</CardTitle>
          {timetable?.homeroomClass ? (
            <p className='text-sm text-muted-foreground'>
              {timetable.homeroomClass.code} — {timetable.semester?.name ?? enrollment?.semesterName}
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          {!enrollment ? (
            <p className='text-sm text-muted-foreground'>Cần ghi danh lớp để xem TKB.</p>
          ) : timetableQuery.isLoading ? (
            <LoadingState />
          ) : timetableQuery.isError ? (
            <ErrorState message='Không tải được TKB lớp' onRetry={() => void timetableQuery.refetch()} />
          ) : (
            <ClassTimetableGrid entries={timetable?.entries ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
