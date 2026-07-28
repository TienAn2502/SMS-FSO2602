import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchMyChildren } from '@/features/portal/api/portal-api';
import { ENROLLMENT_STATUS_LABELS, PARENT_RELATIONSHIP_LABELS } from '@/lib/labels';

export function PortalMyChildrenPage() {
  const childrenQuery = useQuery({
    queryKey: ['portal', 'my-children'],
    queryFn: fetchMyChildren,
  });

  if (childrenQuery.isLoading) return <LoadingState />;
  if (childrenQuery.isError) {
    return <ErrorState message='Không tải được danh sách con' onRetry={() => void childrenQuery.refetch()} />;
  }

  const children = childrenQuery.data ?? [];

  return (
    <div className='space-y-6'>
      <div>
        <Link to={ROUTES.portal} className='text-sm text-muted-foreground hover:text-foreground'>← Portal</Link>
        <h1 className='mt-2 text-2xl font-semibold'>Con của tôi</h1>
      </div>

      {children.length === 0 ? (
        <p className='text-sm text-muted-foreground'>Chưa có học sinh được liên kết.</p>
      ) : (
        <div className='grid gap-4 md:grid-cols-2'>
          {children.map((item) => (
            <Card key={item.linkId}>
              <CardHeader>
                <CardTitle>{item.student.fullName}</CardTitle>
                <p className='text-sm text-muted-foreground'>
                  {PARENT_RELATIONSHIP_LABELS[item.relationship]}
                  {item.isPrimaryContact ? ' · Liên hệ chính' : ''}
                </p>
              </CardHeader>
              <CardContent className='space-y-1 text-sm'>
                {item.student.currentEnrollment ? (
                  <>
                    <p>Lớp: {item.student.currentEnrollment.homeroomClassCode}</p>
                    <p>Học kỳ: {item.student.currentEnrollment.semesterName}</p>
                    <p>Trạng thái: {ENROLLMENT_STATUS_LABELS[item.student.currentEnrollment.status]}</p>
                  </>
                ) : (
                  <p className='text-muted-foreground'>Chưa có ghi danh hiện tại.</p>
                )}
                <Link
                  to={`${ROUTES.portalMyChildren}/${item.student.id}/attendance`}
                  className='mt-3 inline-block text-sm text-primary hover:underline'
                >
                  Xem lịch sử điểm danh
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
