import { Outlet } from 'react-router';

import { AppSidebar } from '@/components/layout/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className='flex h-12 shrink-0 items-center gap-2 border-b px-4'>
          <SidebarTrigger />
          <Separator orientation='vertical' className='mr-2 h-4' />
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
