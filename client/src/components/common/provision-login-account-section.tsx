import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const provisionSchema = z.object({
  email: z.email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

type ProvisionFormValues = z.infer<typeof provisionSchema>;

interface ProvisionLoginAccountSectionProps {
  userEmail: string | null;
  hasAccount: boolean;
  onProvision: (values: ProvisionFormValues) => void;
  isPending?: boolean;
}

export function ProvisionLoginAccountSection({
  userEmail,
  hasAccount,
  onProvision,
  isPending = false,
}: ProvisionLoginAccountSectionProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<ProvisionFormValues>({
    resolver: zodResolver(provisionSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (hasAccount) {
      setOpen(false);
      form.reset();
    }
  }, [hasAccount, form]);

  if (hasAccount) {
    return (
      <div className='rounded-md border border-border p-3'>
        <p className='text-sm font-medium'>Tài khoản đăng nhập</p>
        <p className='mt-1 text-sm text-muted-foreground'>{userEmail}</p>
      </div>
    );
  }

  return (
    <div className='rounded-md border border-border p-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <p className='text-sm font-medium'>Tài khoản đăng nhập</p>
          <p className='mt-1 text-sm text-muted-foreground'>Chưa cấp tài khoản</p>
        </div>
        {!open ? (
          <Button type='button' variant='outline' size='sm' onClick={() => setOpen(true)}>
            Cấp tài khoản
          </Button>
        ) : null}
      </div>

      {open ? (
        <form
          className='mt-4 space-y-3 border-t border-border pt-4'
          onSubmit={form.handleSubmit((values) => {
            onProvision(values);
          })}
        >
          <div className='space-y-2'>
            <Label htmlFor='provision-email'>Email</Label>
            <Input id='provision-email' type='email' {...form.register('email')} />
            {form.formState.errors.email ? (
              <p className='text-sm text-destructive'>
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
          <div className='space-y-2'>
            <Label htmlFor='provision-password'>Mật khẩu</Label>
            <Input
              id='provision-password'
              type='password'
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className='text-sm text-destructive'>
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button type='submit' disabled={isPending}>
              {isPending ? 'Đang cấp...' : 'Cấp tài khoản'}
            </Button>
            <Button
              type='button'
              variant='outline'
              disabled={isPending}
              onClick={() => {
                setOpen(false);
                form.reset();
              }}
            >
              Hủy
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
