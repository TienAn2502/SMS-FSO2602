import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAcademicYear, fetchSemester } from '@/features/academic-years/api/academic-years-api';
import { SemesterEditForm } from '@/features/academic-years/components/semester-edit-form';
import { formatDateRangeVi } from '@/lib/date-format';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { AcademicEntityStatus } from '@/types/api.types';

const STATUS_BADGE: Record<AcademicEntityStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground',
};

export function SemesterDetailPage() {
  const { yearId, id } = useParams<{ yearId: string; id: string }>();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const semesterQuery = useQuery({
    queryKey: ['semesters', yearId, id],
    queryFn: () => fetchSemester(yearId!, id!),
    enabled: Boolean(yearId && id),
  });

  const yearQuery = useQuery({
    queryKey: ['academic-years', yearId],
    queryFn: () => fetchAcademicYear(yearId!),
    enabled: Boolean(yearId),
  });

  if (semesterQuery.isLoading || yearQuery.isLoading) return <LoadingState />;
  if (
    semesterQuery.isError ||
    !semesterQuery.data ||
    yearQuery.isError ||
    !yearQuery.data
  ) {
    return (
      <ErrorState
        message='Không tải được chi tiết học kỳ'
        onRetry={() => void semesterQuery.refetch()}
      />
    );
  }

  const semester = semesterQuery.data;
  const year = yearQuery.data;
  const yearDetailRoute = `${ROUTES.academicYears}/${yearId}`;

  const invalidateSemester = () => {
    void queryClient.invalidateQueries({ queryKey: ['semesters'] });
    void queryClient.invalidateQueries({ queryKey: ['academic-years'] });
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <Link
            to={yearDetailRoute}
            className='text-sm text-muted-foreground hover:text-foreground'
          >
            ← Chi tiết năm học
          </Link>
          <h1 className='mt-2 text-2xl font-semibold'>{semester.name}</h1>
          <p className='text-sm text-muted-foreground'>
            Mã: {semester.code} ·{' '}
            {formatDateRangeVi(semester.startDate, semester.endDate)}
          </p>
        </div>
        {!isEditing ? (
          <Button variant='outline' onClick={() => setIsEditing(true)}>
            Chỉnh sửa
          </Button>
        ) : null}
      </div>

      {isEditing ? (
        <SemesterEditForm
          yearId={yearId!}
          semester={semester}
          academicYearStartDate={year.startDate}
          academicYearEndDate={year.endDate}
          onSuccess={() => {
            invalidateSemester();
            setIsEditing(false);
            void semesterQuery.refetch();
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Thông tin học kỳ</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4 text-sm md:grid-cols-3'>
            <div>
              <p className='text-muted-foreground'>Trạng thái</p>
              <span
                className={cn(
                  'mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                  STATUS_BADGE[semester.status],
                )}
              >
                {ACADEMIC_STATUS_LABELS[semester.status]}
              </span>
            </div>
            <div>
              <p className='text-muted-foreground'>Học kỳ hiện hành</p>
              <p className='mt-1 font-medium'>
                {semester.isCurrent ? 'Có' : 'Không'}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground'>Thời gian</p>
              <p className='mt-1 font-medium'>
                {formatDateRangeVi(semester.startDate, semester.endDate)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
