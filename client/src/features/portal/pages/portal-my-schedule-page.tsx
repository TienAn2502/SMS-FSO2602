import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchMyTimetable } from '@/features/portal/api/portal-api';
import { DAY_OF_WEEK_LABELS } from '@/lib/labels';

export function PortalMySchedulePage() {
  const timetableQuery = useQuery({
    queryKey: ['portal', 'my-timetable'],
    queryFn: () => fetchMyTimetable(),
  });

  if (timetableQuery.isLoading) return <LoadingState />;
  if (timetableQuery.isError) {
    return <ErrorState message='Không tải được thời khóa biểu' onRetry={() => void timetableQuery.refetch()} />;
  }

  const entries = timetableQuery.data ?? [];

  return (
    <div className='space-y-6'>
      <div>
        <Link to={ROUTES.portal} className='text-sm text-muted-foreground hover:text-foreground'>← Portal</Link>
        <h1 className='mt-2 text-2xl font-semibold'>Thời khóa biểu của tôi</h1>
        <p className='text-sm text-muted-foreground'>Học kỳ hiện hành</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Các tiết dạy</CardTitle></CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Chưa có tiết học.</p>
          ) : (
            <ul className='divide-y'>
              {entries.map((entry) => (
                <li key={entry.id} className='grid gap-1 py-3 text-sm md:grid-cols-4'>
                  <span className='font-medium'>{DAY_OF_WEEK_LABELS[entry.dayOfWeek]} — Tiết {entry.periodNumber}</span>
                  <span>{entry.courseSectionCode}</span>
                  <span className='text-muted-foreground'>{entry.courseSectionName}</span>
                  <span className='text-muted-foreground'>{entry.room ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
