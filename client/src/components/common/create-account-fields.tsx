import { type UseFormRegister } from 'react-hook-form';

import { Label } from '@/components/ui/label';

interface CreateAccountFieldsProps {
  createAccount: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  idPrefix?: string;
  /** HS | GV | PH — dùng trong gợi ý mật khẩu mặc định */
  personKind?: 'HS' | 'GV' | 'PH';
}

export function CreateAccountFields({
  createAccount,
  register,
  idPrefix = 'create-account',
  personKind = 'HS',
}: CreateAccountFieldsProps) {
  const passwordHint =
    personKind === 'PH'
      ? 'mã PH + số điện thoại (chỉ số)'
      : `mã ${personKind} + ngày sinh (YYYYMMDD)`;

  return (
    <div className='space-y-2 md:col-span-2'>
      <div className='flex items-center gap-2'>
        <input
          id={`${idPrefix}-checkbox`}
          type='checkbox'
          {...register('createAccount')}
        />
        <Label htmlFor={`${idPrefix}-checkbox`}>Tạo tài khoản đăng nhập</Label>
      </div>
      {createAccount ? (
        <p className='text-sm text-muted-foreground'>
          Đăng nhập bằng mã {personKind} vừa cấp. Mật khẩu mặc định:{' '}
          {passwordHint}.
        </p>
      ) : null}
    </div>
  );
}
