import { NavLink, useMatch, useNavigate } from 'react-router';
import {
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  HeartHandshake,
  Layers,
  LayoutDashboard,
  LogOut,
  School,
  UserRound,
  Users,
  UserSquare2,
} from 'lucide-react';

import { ROUTES } from '@/app/router/routes';
import { ModeToggle } from '@/components/common/mode-toggle';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ROLE_LABELS } from '@/lib/labels';
import type { UserRole } from '@/types/api.types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
  group?: 'main' | 'academic' | 'sprint4' | 'sprint5' | 'portal';
  activePrefix?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.home, label: 'Tổng quan', icon: LayoutDashboard, group: 'main', roles: ['SCHOOL_ADMIN'] },
  {
    to: ROUTES.portal,
    label: 'Portal',
    icon: LayoutDashboard,
    group: 'portal',
    roles: ['TEACHER', 'STUDENT', 'PARENT'],
  },
  {
    to: ROUTES.portalMyClass,
    label: 'Lớp chủ nhiệm',
    icon: School,
    group: 'portal',
    roles: ['TEACHER'],
  },
  {
    to: ROUTES.portalMySchedule,
    label: 'Thời khóa biểu',
    icon: CalendarDays,
    group: 'portal',
    roles: ['TEACHER'],
  },
  {
    to: ROUTES.portalAttendance,
    label: 'Điểm danh',
    icon: ClipboardList,
    group: 'portal',
    roles: ['TEACHER'],
  },
  {
    to: ROUTES.portalMyProfile,
    label: 'Hồ sơ của tôi',
    icon: UserRound,
    group: 'portal',
    roles: ['STUDENT'],
  },
  {
    to: ROUTES.portalMyAttendance,
    label: 'Điểm danh của tôi',
    icon: ClipboardList,
    group: 'portal',
    roles: ['STUDENT'],
  },
  {
    to: ROUTES.portalMyChildren,
    label: 'Con của tôi',
    icon: HeartHandshake,
    group: 'portal',
    roles: ['PARENT'],
  },
  {
    to: ROUTES.users,
    label: 'Người dùng',
    icon: Users,
    roles: ['SCHOOL_ADMIN'],
    group: 'main',
  },
  {
    to: ROUTES.schoolSettings,
    label: 'Cài đặt trường',
    icon: Building2,
    roles: ['SCHOOL_ADMIN'],
    group: 'main',
  },
  {
    to: ROUTES.academicYears,
    label: 'Năm học',
    icon: Calendar,
    roles: ['SCHOOL_ADMIN'],
    group: 'academic',
  },
  {
    to: ROUTES.gradeLevels,
    label: 'Khối',
    icon: Layers,
    roles: ['SCHOOL_ADMIN'],
    group: 'academic',
  },
  {
    to: ROUTES.subjects,
    label: 'Môn học',
    icon: BookOpen,
    roles: ['SCHOOL_ADMIN'],
    group: 'academic',
  },
  {
    to: ROUTES.homeroomClasses,
    label: 'Lớp hành chính',
    icon: School,
    roles: ['SCHOOL_ADMIN'],
    group: 'academic',
  },
  {
    to: ROUTES.students,
    label: 'Học sinh',
    icon: UserRound,
    roles: ['SCHOOL_ADMIN'],
    group: 'academic',
    activePrefix: true,
  },
  {
    to: ROUTES.courseSections,
    label: 'Lớp môn học',
    icon: GraduationCap,
    roles: ['SCHOOL_ADMIN'],
    group: 'academic',
  },
  {
    to: ROUTES.teachers,
    label: 'Giáo viên',
    icon: UserSquare2,
    roles: ['SCHOOL_ADMIN'],
    group: 'sprint4',
    activePrefix: true,
  },
  {
    to: ROUTES.teachingAssignments,
    label: 'Phân công',
    icon: GraduationCap,
    roles: ['SCHOOL_ADMIN'],
    group: 'sprint4',
  },
  {
    to: ROUTES.timetable,
    label: 'Thời khóa biểu',
    icon: CalendarDays,
    roles: ['SCHOOL_ADMIN'],
    group: 'sprint4',
  },
  {
    to: ROUTES.parents,
    label: 'Phụ huynh',
    icon: HeartHandshake,
    roles: ['SCHOOL_ADMIN'],
    group: 'sprint4',
    activePrefix: true,
  },
  {
    to: ROUTES.attendanceSessions,
    label: 'Điểm danh',
    icon: ClipboardList,
    roles: ['SCHOOL_ADMIN'],
    group: 'sprint5',
    activePrefix: true,
  },
];

function SidebarNavItem({ item }: { item: NavItem }) {
  const exactMatch = useMatch({
    path: item.to,
    end: item.to === ROUTES.home || item.to === ROUTES.portal,
  });
  const prefixMatch = useMatch({
    path: `${item.to}/*`,
  });

  const isActive = item.activePrefix
    ? Boolean(exactMatch || prefixMatch)
    : Boolean(exactMatch);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={item.label}
        render={
          <NavLink to={item.to} end={item.to === ROUTES.home || item.to === ROUTES.portal} />
        }
      >
        <item.icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarNavGroup({
  label,
  items,
}: {
  label?: string;
  items: NavItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarNavItem key={item.to} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

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

  const mainItems = visibleItems.filter((item) => item.group === 'main');
  const portalItems = visibleItems.filter((item) => item.group === 'portal');
  const academicItems = visibleItems.filter((item) => item.group === 'academic');
  const sprint4Items = visibleItems.filter((item) => item.group === 'sprint4');
  const sprint5Items = visibleItems.filter((item) => item.group === 'sprint5');

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='border-b border-sidebar-border'>
        <div className='px-2 py-1'>
          <p className='truncate font-semibold group-data-[collapsible=icon]:hidden'>
            eSchool SaaS
          </p>
          <p className='truncate text-xs text-muted-foreground group-data-[collapsible=icon]:hidden'>
            {session?.activeSchool.name}
          </p>
          <p
            className='hidden truncate text-center text-xs font-semibold group-data-[collapsible=icon]:block'
            title='eSchool SaaS'
          >
            eS
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNavGroup items={mainItems} />
        <SidebarNavGroup label='Portal' items={portalItems} />
        <SidebarNavGroup label='Học vụ' items={academicItems} />
        <SidebarNavGroup label='Nhân sự & TKB' items={sprint4Items} />
        <SidebarNavGroup label='Điểm danh' items={sprint5Items} />
      </SidebarContent>

      <SidebarFooter className='border-t border-sidebar-border'>
        {session ? (
          <div className='space-y-1 px-2 py-1 text-xs group-data-[collapsible=icon]:hidden'>
            <p className='truncate font-medium'>{session.user.fullName}</p>
            <p className='truncate text-muted-foreground'>{session.user.email}</p>
            <p className='text-muted-foreground'>
              {ROLE_LABELS[session.user.role]}
            </p>
          </div>
        ) : null}
        <SidebarSeparator className='group-data-[collapsible=icon]:hidden' />
        <div className='flex items-center gap-2 px-2 py-1'>
          <ModeToggle />
          <Button
            variant='outline'
            size='sm'
            className='flex-1 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:px-2'
            onClick={() => void handleLogout()}
            title='Đăng xuất'
          >
            <LogOut className='size-4' />
            <span className='group-data-[collapsible=icon]:hidden'>Đăng xuất</span>
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
