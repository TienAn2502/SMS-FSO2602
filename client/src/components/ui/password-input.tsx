import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function PasswordInput({
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className='relative'>
      <Input
        type={showPassword ? 'text' : 'password'}
        disabled={disabled}
        className={cn('bg-background pr-9', className)}
        {...props}
      />
      <Button
        type='button'
        variant='ghost'
        size='icon'
        disabled={disabled}
        className='absolute top-0 right-0 h-full px-3 hover:bg-transparent'
        onClick={() => setShowPassword((current) => !current)}
        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-pressed={showPassword}
      >
        {showPassword ? (
          <EyeOff className='h-4 w-4 text-muted-foreground' />
        ) : (
          <Eye className='h-4 w-4 text-muted-foreground' />
        )}
      </Button>
    </div>
  );
}

export { PasswordInput };
