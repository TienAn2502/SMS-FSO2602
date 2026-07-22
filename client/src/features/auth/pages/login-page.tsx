import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { ROUTES } from '@/app/router/routes';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/feedback/loading-state';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

import { useAuth } from '../hooks/use-auth';
import {
  loginSchema,
  type LoginFormValues,
} from '../schemas/login.schema';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  if (isLoading) {
    return <LoadingState message='Đang kiểm tra phiên đăng nhập...' />;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      toast.success('Đăng nhập thành công');
      navigate(ROUTES.home, { replace: true });
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Đăng nhập thất bại'),
      );
    }
  });

  return (
    <Card className='w-full max-w-md'>
      <CardHeader>
        <CardTitle>Đăng nhập eSchool</CardTitle>
        <CardDescription>
          Hệ thống quản trị trường học — nhập tài khoản của bạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className='flex flex-col gap-4' onSubmit={onSubmit}>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              type='email'
              autoComplete='email'
              placeholder='admin@demo.edu.vn'
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
            {errors.email ? (
              <p className='text-sm text-destructive'>{errors.email.message}</p>
            ) : null}
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='password'>Mật khẩu</Label>
            <Input
              id='password'
              type='password'
              autoComplete='current-password'
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password ? (
              <p className='text-sm text-destructive'>
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <Button type='submit' disabled={isSubmitting} className='w-full'>
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>

        <p className='mt-4 text-center text-xs text-muted-foreground'>
          Tài khoản dev: admin@demo.edu.vn / Admin@123456
        </p>
        <p className='mt-1 text-center text-xs text-muted-foreground'>
          <Link to={ROUTES.home} className='underline hover:text-foreground'>
            Về trang chủ
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
