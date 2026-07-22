import { NavLink, useNavigate } from 'react-router';
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Users,
} from 'lucide-react';

import { ROUTES } from '@/app/router/routes';
import { ModeToggle } from '@/components/common/mode-toggle';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { UserRole } from '@/types/api.types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.home, label: 'Tổng quan', icon: LayoutDashboard },
  {
    to: ROUTES.users,
    label: 'Người dùng',
    icon: Users,
    roles: ['SCHOOL_ADMIN'],
  },
  {
    to: ROUTES.schoolSettings,
    label: 'Cài đặt trường',
    icon: Building2,
    roles: ['SCHOOL_ADMIN'],
  },
];

export function AppSidebar() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.login, { replace: true });
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      !item.roles || (session && item.roles.includes(session.user.role)),
  );

  return (
    <aside className='flex w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground'>
      <div className='border-b border-sidebar-border p-4'>
        <p className='font-semibold'>eSchool SaaS</p>
        <p className='truncate text-xs text-muted-foreground'>
          {session?.activeSchool.name}
        </p>
      </div>

      <nav className='flex flex-1 flex-col gap-1 p-3'>
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === ROUTES.home}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
              )
            }
          >
            <item.icon className='size-4' />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className='space-y-3 border-t border-sidebar-border p-4'>
        {session ? (
          <div className='text-xs'>
            <p className='font-medium'>{session.user.fullName}</p>
            <p className='text-muted-foreground'>{session.user.email}</p>
            <p className='text-muted-foreground'>
              {ROLE_LABELS[session.user.role]}
            </p>
          </div>
        ) : null}
        <div className='flex items-center gap-2'>
          <ModeToggle />
          <Button
            variant='outline'
            size='sm'
            className='flex-1'
            onClick={() => void handleLogout()}
          >
            <LogOut className='size-4' />
            Đăng xuất
          </Button>
        </div>
      </div>
    </aside>
  );
}
