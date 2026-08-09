import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchStudentEnrollment,
} from '@/features/student-enrollments/api/student-enrollments-api';
import { formatDateVi } from '@/lib/date-format';
import {
  getEnrollmentStatusBadgeClass,
  getEnrollmentStatusLabel,
} from '@/lib/enrollment-display';
import { cn } from '@/lib/utils';

export function StudentEnrollmentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const enrollmentQuery = useQuery({
    queryKey: ['student-enrollments', id],
    queryFn: () => fetchStudentEnrollment(id!),
    enabled: Boolean(id),
  });

  if (enrollmentQuery.isLoading) return <LoadingState />;
  if (enrollmentQuery.isError || !enrollmentQuery.data) {
    return (
      <ErrorState
        message='Không tải được chi tiết ghi danh'
        onRetry={() => void enrollmentQuery.refetch()}
      />
    );
  }

  const enrollment = enrollmentQuery.data;

  return (
    <div className='space-y-6'>
      <div>
        <Link
          to={`${ROUTES.students}/${enrollment.studentId}`}
          className='text-sm text-muted-foreground hover:text-foreground'
        >
          ← Hồ sơ học sinh
        </Link>
        <h1 className='mt-2 text-2xl font-semibold'>Chi tiết ghi danh</h1>
        <p className='text-sm text-muted-foreground'>{enrollment.studentFullName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Thông tin ghi danh</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-5 text-sm md:grid-cols-2'>
          <div>
            <p className='text-muted-foreground'>Năm học</p>
            <p className='mt-1 font-medium'>
              {enrollment.academicYearName} ({enrollment.academicYearCode})
            </p>
          </div>
          <div>
            <p className='text-muted-foreground'>Học kỳ</p>
            <p className='mt-1 font-medium'>
              {enrollment.semesterName} ({enrollment.semesterCode})
            </p>
          </div>
          <div>
            <p className='text-muted-foreground'>Lớp hành chính</p>
            <p className='mt-1 font-medium'>
              {enrollment.homeroomClassCode} — {enrollment.homeroomClassName}
            </p>
          </div>
          <div>
            <p className='text-muted-foreground'>Trạng thái</p>
            <span
              className={cn(
                'mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                getEnrollmentStatusBadgeClass(enrollment),
              )}
            >
              {getEnrollmentStatusLabel(enrollment)}
            </span>
          </div>
          <div>
            <p className='text-muted-foreground'>Ngày vào lớp</p>
            <p className='mt-1 font-medium'>{formatDateVi(enrollment.enrolledAt)}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Ngày rời lớp</p>
            <p className='mt-1 font-medium'>{formatDateVi(enrollment.leftAt)}</p>
          </div>
          <div className='md:col-span-2'>
            <p className='text-muted-foreground'>Ghi chú</p>
            <p className='mt-1 font-medium'>{enrollment.note || '—'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
