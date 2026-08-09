import { Outlet } from 'react-router';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className='flex h-12 shrink-0 items-center border-b px-6'>
          <span className='text-sm font-medium text-muted-foreground'>
            eSchool SaaS
          </span>
        </header>
        <div className='flex-1 overflow-auto p-6'>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
