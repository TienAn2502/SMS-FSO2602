import { Outlet } from 'react-router';

import { AppHeader } from '@/components/layout/app-header';
import { ImpersonationBanner } from '@/components/layout/impersonation-banner';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function AppLayout() {
    return (
        <SidebarProvider className='h-svh overflow-hidden'>
            <AppSidebar />
            <SidebarInset className='min-h-0 overflow-hidden'>
                <ImpersonationBanner />
                <AppHeader />
                <div className='min-h-0 flex-1 overflow-y-auto p-6 pb-10'>
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
