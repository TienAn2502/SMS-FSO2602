import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchPlatformSchoolCount } from '@/features/platform/api/platform-schools-api';
import { ROLE_LABELS } from '@/lib/labels';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function PlatformDashboardPage() {
  const { session } = useAuth();

  const countQuery = useQuery({
    queryKey: ['platform-school-count'],
    queryFn: fetchPlatformSchoolCount,
  });

  if (!session) {
    return null;
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Quản trị nền tảng</h1>
        <p className='text-sm text-muted-foreground'>
          Tài khoản system admin — quản lý SaaS multi-tenant
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Tổng số trường</CardTitle>
            <CardDescription>Tenant đã đăng ký trên nền tảng</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-semibold'>
              {countQuery.isLoading ? '…' : (countQuery.data ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quản lý trường</CardTitle>
            <CardDescription>Tạo tenant mới, khóa/mở trường</CardDescription>
          </CardHeader>
          <CardContent>
          <Button render={<Link to={ROUTES.platformSchools} />}>
            Mở danh sách trường
          </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin tài khoản</CardTitle>
          <CardDescription>Phiên đăng nhập platform admin</CardDescription>
        </CardHeader>
        <CardContent className='space-y-1 text-sm'>
          <p>
            <span className='text-muted-foreground'>Họ tên:</span>{' '}
            {session.user.fullName}
          </p>
          <p>
            <span className='text-muted-foreground'>Email:</span>{' '}
            {session.user.email}
          </p>
          <p>
            <span className='text-muted-foreground'>Vai trò:</span>{' '}
            {ROLE_LABELS[session.user.role]}
          </p>
          <p>
            <span className='text-muted-foreground'>Trường active:</span>{' '}
            {session.activeSchool
              ? `${session.activeSchool.name} (${session.activeSchool.code})`
              : 'Không gắn trường (platform)'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
