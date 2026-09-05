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
                <div
                    style={{
                        overscrollBehaviorY: 'contain',
                        WebkitOverflowScrolling: 'touch', // Giúp cuộn mượt mà (momentum scrolling) trên iOS Safari
                        touchAction: 'pan-y', // Ưu tiên tuyệt đối cho cử chỉ cuộn dọc, bỏ qua độ trễ chạm
                    }}
                    className='min-h-0 flex-1 overflow-y-auto p-6 pb-10'
                >
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
