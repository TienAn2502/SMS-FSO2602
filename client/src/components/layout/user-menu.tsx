import { KeyRound, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ROLE_LABELS } from '@/lib/labels';

function getNameInitial(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return '?';
  }

  return trimmed.charAt(0).toLocaleUpperCase('vi-VN');
}

export function UserMenu() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  if (!session) {
    return null;
  }

  const { user } = session;
  const initial = getNameInitial(user.fullName);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='ghost' size='icon' className='rounded-full' />
        }
      >
        <Avatar size='sm'>
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <span className='sr-only'>Menu tài khoản</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-56'>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-0.5'>
              <p className='truncate text-sm font-medium text-foreground'>
                {user.fullName}
              </p>
              <p className='truncate text-xs'>{user.email}</p>
              <p className='text-xs'>{ROLE_LABELS[user.role]}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => navigate(ROUTES.changePassword)}
          >
            <KeyRound />
            Đổi mật khẩu
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant='destructive'
          onClick={() => void handleLogout()}
        >
          <LogOut />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
