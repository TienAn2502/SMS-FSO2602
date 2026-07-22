import { createBrowserRouter, Navigate } from 'react-router';

import { AppLayout } from '@/app/layouts/app-layout';
import { AuthLayout } from '@/app/layouts/auth-layout';
import { ROUTES } from '@/app/router/routes';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { RoleGate } from '@/components/auth/role-gate';
import { LoginPage } from '@/features/auth/pages/login-page';
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page';
import { SchoolSettingsPage } from '@/features/schools/pages/school-settings-page';
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
    ],
  },
  {
    path: '*',
    element: <Navigate to={ROUTES.home} replace />,
  },
]);
