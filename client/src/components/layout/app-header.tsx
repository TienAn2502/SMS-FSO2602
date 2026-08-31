import { ModeToggle } from '@/components/common/mode-toggle';
import { NotificationBell } from '@/components/layout/notification-bell';
import { UserMenu } from '@/components/layout/user-menu';

export function AppHeader() {
    return (
        <header className='flex h-12 shrink-0 items-center justify-between gap-3 border-b px-6'>
            <span className='truncate text-sm font-medium text-muted-foreground'>
                eSchool SaaS
            </span>
            <div className='flex items-center gap-2'>
                <NotificationBell />
                <ModeToggle />
                <UserMenu />
            </div>
        </header>
    );
}
