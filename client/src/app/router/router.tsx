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
import { SchoolSettingsPage } from '@/features/schools/pages/school-settings-page';
import { SubjectsPage } from '@/features/subjects/pages/subjects-page';
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
    ],
  },
  {
    path: '*',
    element: <Navigate to={ROUTES.home} replace />,
  },
]);
