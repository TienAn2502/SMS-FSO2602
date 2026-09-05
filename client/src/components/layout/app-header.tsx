import { ModeToggle } from '@/components/common/mode-toggle';
import { NotificationBell } from '@/components/layout/notification-bell';
import { UserMenu } from '@/components/layout/user-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function AppHeader() {
    return (
        <header className='flex h-12 shrink-0 items-center justify-between gap-3 border-b px-6'>
            <SidebarTrigger className='md:hidden' />

            <div className='flex ml-auto items-center gap-2'>
                <NotificationBell />
                <ModeToggle />
                <UserMenu />
            </div>
        </header>
    );
}
