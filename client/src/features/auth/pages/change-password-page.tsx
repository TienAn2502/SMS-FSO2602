import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { changePassword } from '@/features/auth/api/auth-api';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/features/auth/schemas/change-password.schema';
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
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

export function ChangePasswordPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success('Đổi mật khẩu thành công');
      reset();
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Đổi mật khẩu thất bại',
        ),
      );
    },
  });

  return (
    <div className='mx-auto max-w-lg space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Đổi mật khẩu</h1>
        <p className='text-sm text-muted-foreground'>
          Cập nhật mật khẩu đăng nhập cho tài khoản của bạn
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mật khẩu mới</CardTitle>
          <CardDescription>
            Nhập mật khẩu hiện tại và mật khẩu mới (tối thiểu 8 ký tự)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className='space-y-4'
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
          >
            <div className='space-y-2'>
              <Label htmlFor='currentPassword'>Mật khẩu hiện tại</Label>
              <Input
                id='currentPassword'
                type='password'
                autoComplete='current-password'
                aria-invalid={Boolean(errors.currentPassword)}
                {...register('currentPassword')}
              />
              {errors.currentPassword ? (
                <p className='text-sm text-destructive'>
                  {errors.currentPassword.message}
                </p>
              ) : null}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='newPassword'>Mật khẩu mới</Label>
              <Input
                id='newPassword'
                type='password'
                autoComplete='new-password'
                aria-invalid={Boolean(errors.newPassword)}
                {...register('newPassword')}
              />
              {errors.newPassword ? (
                <p className='text-sm text-destructive'>
                  {errors.newPassword.message}
                </p>
              ) : null}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Xác nhận mật khẩu mới</Label>
              <Input
                id='confirmPassword'
                type='password'
                autoComplete='new-password'
                aria-invalid={Boolean(errors.confirmPassword)}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword ? (
                <p className='text-sm text-destructive'>
                  {errors.confirmPassword.message}
                </p>
              ) : null}
            </div>

            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? 'Đang lưu…' : 'Đổi mật khẩu'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
