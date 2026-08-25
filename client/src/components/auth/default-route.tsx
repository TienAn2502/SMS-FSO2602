import { ROUTES } from '@/app/router/routes';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page';
import { Navigate } from 'react-router';

const DefaultRoute = () => {
    const { isAuthenticated, session } = useAuth();

    if (!isAuthenticated || !session?.user) {
        return <Navigate to={ROUTES.login} replace />;
    }

    const role = session.user.role;

    if (['STUDENT', 'TEACHER', 'PARENT'].includes(role)) {
        return <Navigate to={ROUTES.portal} replace />;
    }

    if (role === 'SCHOOL_ADMIN') {
        return <DashboardPage />;
    }

    // fallback
    return <Navigate to={ROUTES.login} replace />;
};

export default DefaultRoute;
