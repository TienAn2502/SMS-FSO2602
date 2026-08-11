import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AcademicYearEditForm } from '@/features/academic-years/components/academic-year-edit-form';
import { AcademicYearSemestersSection } from '@/features/academic-years/components/academic-year-semesters-section';
import { fetchAcademicYear } from '@/features/academic-years/api/academic-years-api';
import { formatDateRangeVi } from '@/lib/date-format';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { AcademicEntityStatus } from '@/types/api.types';

const STATUS_BADGE: Record<AcademicEntityStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground',
};

export function AcademicYearDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const yearQuery = useQuery({
    queryKey: ['academic-years', id],
    queryFn: () => fetchAcademicYear(id!),
    enabled: Boolean(id),
  });

  if (yearQuery.isLoading) {
    return <LoadingState />;
  }

  if (yearQuery.isError || !yearQuery.data) {
    return (
      <ErrorState
        message='Không tải được chi tiết năm học'
        onRetry={() => void yearQuery.refetch()}
      />
    );
  }

  const year = yearQuery.data;

  return (
    <div className='space-y-6'>
      <div>
        <Link
          to={ROUTES.academicYears}
          className='text-sm text-muted-foreground hover:text-foreground'
        >
          ← Danh sách năm học
        </Link>
        <h1 className='mt-2 text-2xl font-semibold'>{year.name}</h1>
        <p className='text-sm text-muted-foreground'>
          Mã: {year.code} · {formatDateRangeVi(year.startDate, year.endDate)}
        </p>
      </div>

      <Card>
        <CardHeader className='flex flex-row items-start justify-between gap-4 space-y-0'>
          <CardTitle className='text-base'>Thông tin năm học</CardTitle>
          {!editing ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setEditing(true)}
            >
              Chỉnh sửa
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {editing ? (
            <AcademicYearEditForm
              year={year}
              onCancel={() => setEditing(false)}
              onSuccess={() => {
                setEditing(false);
                void queryClient.invalidateQueries({
                  queryKey: ['academic-years'],
                });
              }}
            />
          ) : (
            <div className='grid gap-4 text-sm md:grid-cols-3'>
              <div>
                <p className='text-muted-foreground'>Trạng thái</p>
                <span
                  className={cn(
                    'mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                    STATUS_BADGE[year.status],
                  )}
                >
                  {ACADEMIC_STATUS_LABELS[year.status]}
                </span>
              </div>
              <div>
                <p className='text-muted-foreground'>Năm hiện hành</p>
                <p className='mt-1 font-medium'>
                  {year.isCurrent ? 'Có' : 'Không'}
                </p>
              </div>
              <div>
                <p className='text-muted-foreground'>Thời gian</p>
                <p className='mt-1 font-medium'>
                  {formatDateRangeVi(year.startDate, year.endDate)}
                </p>
              </div>
              <div>
                <p className='text-muted-foreground'>Tên</p>
                <p className='mt-1 font-medium'>{year.name}</p>
              </div>
              <div>
                <p className='text-muted-foreground'>Mã</p>
                <p className='mt-1 font-medium'>{year.code}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AcademicYearSemestersSection
        yearId={year.id}
        yearName={year.name}
        yearStartDate={year.startDate}
        yearEndDate={year.endDate}
        yearIsCurrent={year.isCurrent}
      />
    </div>
  );
}
