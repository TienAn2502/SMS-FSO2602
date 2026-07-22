import { Outlet } from 'react-router';

import { AppSidebar } from '@/components/layout/app-sidebar';

export function AppLayout() {
  return (
    <div className='flex min-h-svh bg-background'>
      <AppSidebar />
      <main className='flex-1 overflow-auto p-6'>
        <Outlet />
      </main>
    </div>
  );
}
