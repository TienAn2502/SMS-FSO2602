import { useAuth } from '@/features/auth/hooks/use-auth';
import { ROLE_LABELS } from '@/lib/labels';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function DashboardPage() {
  const { session } = useAuth();

  if (!session) {
    return null;
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Tổng quan</h1>
        <p className='text-sm text-muted-foreground'>
          Chào mừng bạn quay trở lại hệ thống quản trị trường học
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Thông tin tài khoản</CardTitle>
            <CardDescription>Phiên đăng nhập hiện tại</CardDescription>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trường đang hoạt động</CardTitle>
            <CardDescription>Tenant hiện tại</CardDescription>
          </CardHeader>
          <CardContent className='space-y-1 text-sm'>
            {session.activeSchool ? (
              <>
                <p>
                  <span className='text-muted-foreground'>Tên:</span>{' '}
                  {session.activeSchool.name}
                </p>
                <p>
                  <span className='text-muted-foreground'>Mã:</span>{' '}
                  {session.activeSchool.code}
                </p>
              </>
            ) : (
              <p className='text-muted-foreground'>
                {session.user.role === 'SYSTEM_ADMIN'
                  ? 'Quản trị nền tảng — chưa vào xem trường nào'
                  : 'Không xác định được trường đang hoạt động'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
