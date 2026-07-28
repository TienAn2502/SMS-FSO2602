import { createBrowserRouter, Navigate } from 'react-router';

import { AppLayout } from '@/app/layouts/app-layout';
import { AuthLayout } from '@/app/layouts/auth-layout';
import { ROUTES } from '@/app/router/routes';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { RoleGate } from '@/components/auth/role-gate';
import { LoginPage } from '@/features/auth/pages/login-page';
import { AcademicYearsPage } from '@/features/academic-years/pages/academic-years-page';
import { CourseSectionsPage } from '@/features/course-sections/pages/course-sections-page';
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page';
import { GradeLevelsPage } from '@/features/grade-levels/pages/grade-levels-page';
import { HomeroomClassesPage } from '@/features/homeroom-classes/pages/homeroom-classes-page';
import { ParentDetailPage } from '@/features/parents/pages/parent-detail-page';
import { ParentsPage } from '@/features/parents/pages/parents-page';
import { AttendanceSessionDetailPage } from '@/features/attendance/pages/attendance-session-detail-page';
import { AttendanceSessionsPage } from '@/features/attendance/pages/attendance-sessions-page';
import { PortalAttendancePage } from '@/features/portal/pages/portal-attendance-page';
import { PortalChildAttendancePage } from '@/features/portal/pages/portal-child-attendance-page';
import { PortalMyAttendancePage } from '@/features/portal/pages/portal-my-attendance-page';
import { PortalDashboardPage } from '@/features/portal/pages/portal-dashboard-page';
import { PortalMyChildrenPage } from '@/features/portal/pages/portal-my-children-page';
import { PortalMyClassPage } from '@/features/portal/pages/portal-my-class-page';
import { PortalMyProfilePage } from '@/features/portal/pages/portal-my-profile-page';
import { PortalMySchedulePage } from '@/features/portal/pages/portal-my-schedule-page';
import { SchoolSettingsPage } from '@/features/schools/pages/school-settings-page';
import { StudentDetailPage } from '@/features/students/pages/student-detail-page';
import { StudentsPage } from '@/features/students/pages/students-page';
import { SubjectsPage } from '@/features/subjects/pages/subjects-page';
import { TeacherDetailPage } from '@/features/teachers/pages/teacher-detail-page';
import { TeachersPage } from '@/features/teachers/pages/teachers-page';
import { TeachingAssignmentsPage } from '@/features/teaching-assignments/pages/teaching-assignments-page';
import { TimetablePage } from '@/features/timetable/pages/timetable-page';
import { UsersPage } from '@/features/users/pages/users-page';

export const router = createBrowserRouter([
  {
    path: ROUTES.login,
    element: (
      <AuthLayout>
        <LoginPage />
      </AuthLayout>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.users.slice(1),
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <UsersPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.schoolSettings.slice(1),
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <SchoolSettingsPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.academicYears.slice(1),
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <AcademicYearsPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.gradeLevels.slice(1),
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <GradeLevelsPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.subjects.slice(1),
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <SubjectsPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.homeroomClasses.slice(1),
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <HomeroomClassesPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.courseSections.slice(1),
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <CourseSectionsPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.students.slice(1),
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <StudentsPage />
          </RoleGate>
        ),
      },
      {
        path: `${ROUTES.students.slice(1)}/:id`,
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <StudentDetailPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.teachers.slice(1),
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <TeachersPage />
          </RoleGate>
        ),
      },
      {
        path: `${ROUTES.teachers.slice(1)}/:id`,
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <TeacherDetailPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.teachingAssignments.slice(1),
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <TeachingAssignmentsPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.timetable.slice(1),
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <TimetablePage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.parents.slice(1),
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <ParentsPage />
          </RoleGate>
        ),
      },
      {
        path: `${ROUTES.parents.slice(1)}/:id`,
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <ParentDetailPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.attendanceSessions.slice(1),
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <AttendanceSessionsPage />
          </RoleGate>
        ),
      },
      {
        path: `${ROUTES.attendanceSessions.slice(1)}/:id`,
        element: (
          <RoleGate roles={['SCHOOL_ADMIN']}>
            <AttendanceSessionDetailPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.portal.slice(1),
        element: (
          <RoleGate roles={['TEACHER', 'STUDENT', 'PARENT']}>
            <PortalDashboardPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.portalMyClass.slice(1),
        element: (
          <RoleGate roles={['TEACHER']}>
            <PortalMyClassPage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.portalMySchedule.slice(1),
        element: (
          <RoleGate roles={['TEACHER']}>
            <PortalMySchedulePage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.portalMyProfile.slice(1),
        element: (
          <RoleGate roles={['STUDENT']}>
            <PortalMyProfilePage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.portalMyChildren.slice(1),
        element: (
          <RoleGate roles={['PARENT']}>
            <PortalMyChildrenPage />
          </RoleGate>
        ),
      },
      {
        path: `${ROUTES.portalMyChildren.slice(1)}/:studentId/attendance`,
        element: (
          <RoleGate roles={['PARENT']}>
            <PortalChildAttendancePage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.portalAttendance.slice(1),
        element: (
          <RoleGate roles={['TEACHER']}>
            <PortalAttendancePage />
          </RoleGate>
        ),
      },
      {
        path: ROUTES.portalMyAttendance.slice(1),
        element: (
          <RoleGate roles={['STUDENT']}>
            <PortalMyAttendancePage />
          </RoleGate>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={ROUTES.home} replace />,
  },
]);
