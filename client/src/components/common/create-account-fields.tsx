import { type FieldErrors, type UseFormRegister } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateAccountFieldsProps {
  createAccount: boolean;
  register: UseFormRegister<{
    createAccount?: boolean;
    email?: string;
    password?: string;
  }>;
  errors: FieldErrors<{
    createAccount?: boolean;
    email?: string;
    password?: string;
  }>;
  idPrefix?: string;
}

export function CreateAccountFields({
  createAccount,
  register,
  errors,
  idPrefix = 'create-account',
}: CreateAccountFieldsProps) {
  return (
    <>
      <div className='flex items-center gap-2 md:col-span-2'>
        <input
          id={`${idPrefix}-checkbox`}
          type='checkbox'
          {...register('createAccount')}
        />
        <Label htmlFor={`${idPrefix}-checkbox`}>Tạo tài khoản đăng nhập</Label>
      </div>
      {createAccount ? (
        <>
          <div className='space-y-2'>
            <Label htmlFor={`${idPrefix}-email`}>Email</Label>
            <Input id={`${idPrefix}-email`} type='email' {...register('email')} />
            {errors.email ? (
              <p className='text-sm text-destructive'>{errors.email.message}</p>
            ) : null}
          </div>
          <div className='space-y-2'>
            <Label htmlFor={`${idPrefix}-password`}>Mật khẩu</Label>
            <Input
              id={`${idPrefix}-password`}
              type='password'
              {...register('password')}
            />
            {errors.password ? (
              <p className='text-sm text-destructive'>{errors.password.message}</p>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}
