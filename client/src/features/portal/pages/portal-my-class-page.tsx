import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchMyHomeroomClassStudents,
  fetchMyHomeroomClasses,
} from '@/features/portal/api/portal-api';
import { ENROLLMENT_STATUS_LABELS } from '@/lib/labels';
import { selectClassName } from '@/lib/form-styles';

export function PortalMyClassPage() {
  const classesQuery = useQuery({
    queryKey: ['portal', 'my-homeroom-classes'],
    queryFn: fetchMyHomeroomClasses,
  });

  const [selectedClassId, setSelectedClassId] = useState('');

  const activeClassId = selectedClassId || classesQuery.data?.[0]?.id || '';

  const studentsQuery = useQuery({
    queryKey: ['portal', 'my-homeroom-students', activeClassId],
    queryFn: () => fetchMyHomeroomClassStudents(activeClassId),
    enabled: Boolean(activeClassId),
  });

  if (classesQuery.isLoading) return <LoadingState />;
  if (classesQuery.isError) {
    return <ErrorState message='Không tải được lớp chủ nhiệm' onRetry={() => void classesQuery.refetch()} />;
  }

  return (
    <div className='space-y-6'>
      <div>
        <Link to={ROUTES.portal} className='text-sm text-muted-foreground hover:text-foreground'>← Portal</Link>
        <h1 className='mt-2 text-2xl font-semibold'>Lớp chủ nhiệm</h1>
      </div>

      {classesQuery.data?.length === 0 ? (
        <p className='text-sm text-muted-foreground'>Bạn chưa được phân công làm GVCN.</p>
      ) : (
        <>
          <div className='max-w-xs space-y-2'>
            <label className='text-sm font-medium'>Chọn lớp</label>
            <select
              className={selectClassName}
              value={activeClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              {classesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>

          <Card>
            <CardHeader><CardTitle>Học sinh (học kỳ hiện hành)</CardTitle></CardHeader>
            <CardContent>
              {studentsQuery.isLoading ? <LoadingState /> : null}
              {studentsQuery.data?.length === 0 ? (
                <p className='text-sm text-muted-foreground'>Không có học sinh ACTIVE.</p>
              ) : (
                <ul className='divide-y'>
                  {studentsQuery.data?.map((e) => (
                    <li key={e.id} className='flex justify-between py-2 text-sm'>
                      <span>{e.studentFullName}</span>
                      <span className='text-muted-foreground'>{ENROLLMENT_STATUS_LABELS[e.status]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
