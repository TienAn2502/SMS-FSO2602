import { useState } from 'react';

import { Button } from '@/components/ui/button';

interface ProvisionLoginAccountSectionProps {
  /** Mã HS/GV/PH dùng để đăng nhập */
  loginCode: string | null;
  hasAccount: boolean;
  /** HS | GV: mật khẩu = mã + ngày sinh; PH: mã + SĐT */
  passwordHint: string;
  onProvision: () => void;
  isPending?: boolean;
}

export function ProvisionLoginAccountSection({
  loginCode,
  hasAccount,
  passwordHint,
  onProvision,
  isPending = false,
}: ProvisionLoginAccountSectionProps) {
  const [open, setOpen] = useState(false);

  if (hasAccount) {
    return (
      <div className='rounded-md border border-border p-3'>
        <p className='text-sm font-medium'>Tài khoản đăng nhập</p>
        <p className='mt-1 text-sm text-muted-foreground'>
          {loginCode
            ? `Đăng nhập bằng mã ${loginCode}`
            : 'Đã cấp tài khoản'}
        </p>
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
        <div className='mt-4 space-y-3 border-t border-border pt-4'>
          <p className='text-sm text-muted-foreground'>
            Đăng nhập bằng mã hồ sơ{loginCode ? ` (${loginCode})` : ''}. Mật khẩu
            mặc định: {passwordHint}.
          </p>
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              disabled={isPending}
              onClick={() => onProvision()}
            >
              {isPending ? 'Đang cấp...' : 'Cấp tài khoản'}
            </Button>
            <Button
              type='button'
              variant='outline'
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Hủy
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
