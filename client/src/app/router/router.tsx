import { createBrowserRouter, Navigate } from 'react-router';

import { AppLayout } from '@/app/layouts/app-layout';
import { AuthLayout } from '@/app/layouts/auth-layout';
import { ROUTES } from '@/app/router/routes';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { RoleGate } from '@/components/auth/role-gate';
import { LoginPage } from '@/features/auth/pages/login-page';
import { ChangePasswordPage } from '@/features/auth/pages/change-password-page';
import { AcademicYearDetailPage } from '@/features/academic-years/pages/academic-year-detail-page';
import { AcademicYearsPage } from '@/features/academic-years/pages/academic-years-page';
import { SemesterDetailPage } from '@/features/academic-years/pages/semester-detail-page';
import { CourseSectionDetailPage } from '@/features/course-sections/pages/course-section-detail-page';
import { CourseSectionsPage } from '@/features/course-sections/pages/course-sections-page';
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page';
import { PlatformDashboardPage } from '@/features/platform/pages/platform-dashboard-page';
import { PlatformSchoolsPage } from '@/features/platform/pages/platform-schools-page';
import { PlatformSchoolDetailPage } from '@/features/platform/pages/platform-school-detail-page';
import { GradeLevelSubjectsPage } from '@/features/grade-level-subjects/pages/grade-level-subjects-page';
import { GradeLevelsPage } from '@/features/grade-levels/pages/grade-levels-page';
import { HomeroomClassDetailPage } from '@/features/homeroom-classes/pages/homeroom-class-detail-page';
import { HomeroomClassesPage } from '@/features/homeroom-classes/pages/homeroom-classes-page';
import { ParentDetailPage } from '@/features/parents/pages/parent-detail-page';
import { ParentsPage } from '@/features/parents/pages/parents-page';
import { AttendanceSessionDetailPage } from '@/features/attendance/pages/attendance-session-detail-page';
import { AttendanceSessionsPage } from '@/features/attendance/pages/attendance-sessions-page';
import { AssessmentsPage } from '@/features/gradebook/pages/assessments-page';
import { GradebookSectionDetailPage } from '@/features/gradebook/pages/gradebook-section-detail-page';
import { PortalAttendancePage } from '@/features/portal/pages/portal-attendance-page';
import { PortalChildAttendancePage } from '@/features/portal/pages/portal-child-attendance-page';
import { PortalChildScoresPage } from '@/features/portal/pages/portal-child-scores-page';
import { PortalMyGradebookClassPage } from '@/features/portal/pages/portal-my-gradebook-class-page';
import { PortalMyGradebookPage } from '@/features/portal/pages/portal-my-gradebook-page';
import { PortalMyGradebookSemestersPage } from '@/features/portal/pages/portal-my-gradebook-semesters-page';
import { PortalMyAttendancePage } from '@/features/portal/pages/portal-my-attendance-page';
import { GradeSummariesPage } from '@/features/grade-summaries/pages/grade-summaries-page';
import { PortalChildSummariesPage } from '@/features/portal/pages/portal-child-summaries-page';
import { PortalHomeroomConductPage } from '@/features/portal/pages/portal-homeroom-conduct-page';
import { PortalHomeroomSummariesPage } from '@/features/portal/pages/portal-homeroom-summaries-page';
import { PortalMySummariesPage } from '@/features/portal/pages/portal-my-summaries-page';
import { PortalMyScoresPage } from '@/features/portal/pages/portal-my-scores-page';
import { PortalDashboardPage } from '@/features/portal/pages/portal-dashboard-page';
import { PortalMyChildrenPage } from '@/features/portal/pages/portal-my-children-page';
import { PortalMyClassPage } from '@/features/portal/pages/portal-my-class-page';
import { PortalMyCourseSectionsPage } from '@/features/portal/pages/portal-my-course-sections-page';
import { PortalMyClassTimetablePage } from '@/features/portal/pages/portal-my-class-timetable-page';
import { PortalMyProfilePage } from '@/features/portal/pages/portal-my-profile-page';
import { PortalMySchedulePage } from '@/features/portal/pages/portal-my-schedule-page';
import { BlogCreatePage } from '@/features/blogs/pages/blog-create-page';
import { BlogDetailPage } from '@/features/blogs/pages/blog-detail-page';
import { BlogEditPage } from '@/features/blogs/pages/blog-edit-page';
import { BlogsPage } from '@/features/blogs/pages/blogs-page';
import { SchoolSettingsPage } from '@/features/schools/pages/school-settings-page';
import { NotificationCreatePage } from '@/features/notifications/pages/notification-create-page';
import { NotificationDetailPage } from '@/features/notifications/pages/notification-detail-page';
import { NotificationEditPage } from '@/features/notifications/pages/notification-edit-page';
import { NotificationsPage } from '@/features/notifications/pages/notifications-page';
import { StudentDetailPage } from '@/features/students/pages/student-detail-page';
import { StudentEnrollmentDetailPage } from '@/features/student-enrollments/pages/student-enrollment-detail-page';
import { StudentsPage } from '@/features/students/pages/students-page';
import { ClassPlacementPage } from '@/features/class-placement/pages/class-placement-page';
import { SubjectsPage } from '@/features/subjects/pages/subjects-page';
import { TeacherDetailPage } from '@/features/teachers/pages/teacher-detail-page';
import { TeachersPage } from '@/features/teachers/pages/teachers-page';
import { TeachingAssignmentsPage } from '@/features/teaching-assignments/pages/teaching-assignments-page';
import { TimetablePage } from '@/features/timetable/pages/timetable-page';
import { UsersPage } from '@/features/users/pages/users-page';
import { DeviceSessionsPage } from '@/features/device-sessions/pages/device-sessions-page';
import DefaultRoute from '@/components/auth/default-route';

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
                element: <DefaultRoute />,
            },
            {
                path: ROUTES.platform.slice(1),
                element: (
                    <RoleGate roles={['SYSTEM_ADMIN']}>
                        <PlatformDashboardPage />
                    </RoleGate>
                ),
            },
            {
                path: ROUTES.platformSchools.slice(1),
                element: (
                    <RoleGate roles={['SYSTEM_ADMIN']}>
                        <PlatformSchoolsPage />
                    </RoleGate>
                ),
            },
            {
                path: `${ROUTES.platformSchools.slice(1)}/:id`,
                element: (
                    <RoleGate roles={['SYSTEM_ADMIN']}>
                        <PlatformSchoolDetailPage />
                    </RoleGate>
                ),
            },
            {
                path: `${ROUTES.platformSchools.slice(1)}/:id`,
                element: (
                    <RoleGate roles={['SYSTEM_ADMIN']}>
                        <PlatformSchoolDetailPage />
                    </RoleGate>
                ),
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
                path: ROUTES.notifications.slice(1),
                element: (
                    <RoleGate
                        roles={['SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT']}
                    >
                        <NotificationsPage />
                    </RoleGate>
                ),
            },
            {
                path: `${ROUTES.notifications.slice(1)}/new`,
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN']}>
                        <NotificationCreatePage />
                    </RoleGate>
                ),
            },
            {
                path: `${ROUTES.notifications.slice(1)}/:slug/edit`,
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN']}>
                        <NotificationEditPage />
                    </RoleGate>
                ),
            },
            {
                path: `${ROUTES.notifications.slice(1)}/:slug`,
                element: (
                    <RoleGate
                        roles={['SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT']}
                    >
                        <NotificationDetailPage />
                    </RoleGate>
                ),
            },
            {
                path: ROUTES.blogs.slice(1),
                element: (
                    <RoleGate
                        roles={['SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT']}
                    >
                        <BlogsPage />
                    </RoleGate>
                ),
            },
            {
                path: `${ROUTES.blogs.slice(1)}/new`,
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN']}>
                        <BlogCreatePage />
                    </RoleGate>
                ),
            },
            {
                path: `${ROUTES.blogs.slice(1)}/:slug/edit`,
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN']}>
                        <BlogEditPage />
                    </RoleGate>
                ),
            },
            {
                path: `${ROUTES.blogs.slice(1)}/:slug`,
                element: (
                    <RoleGate
                        roles={['SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT']}
                    >
                        <BlogDetailPage />
                    </RoleGate>
                ),
            },
            {
                path: ROUTES.changePassword.slice(1),
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN', 'TEACHER', 'STUDENT']}>
                        <ChangePasswordPage />
                    </RoleGate>
                ),
            },
            {
                path: ROUTES.deviceSessions.slice(1),
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT']}>
                        <DeviceSessionsPage />
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
                path: `${ROUTES.academicYears.slice(1)}/:id`,
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN']}>
                        <AcademicYearDetailPage />
                    </RoleGate>
                ),
            },
            {
                path: `${ROUTES.academicYears.slice(1)}/:yearId/semesters/:id`,
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN']}>
                        <SemesterDetailPage />
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
                path: ROUTES.gradeLevelSubjects.slice(1),
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN']}>
                        <GradeLevelSubjectsPage />
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
                path: `${ROUTES.homeroomClasses.slice(1)}/:id`,
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN']}>
                        <HomeroomClassDetailPage />
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
                path: `${ROUTES.courseSections.slice(1)}/:id`,
                element: (
                    <RoleGate
                        roles={['SCHOOL_ADMIN', 'STUDENT', 'TEACHER', 'PARENT']}
                    >
                        <CourseSectionDetailPage />
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
                path: ROUTES.classPlacement.slice(1),
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN']}>
                        <ClassPlacementPage />
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
                path: `${ROUTES.studentEnrollments.slice(1)}/:id`,
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN']}>
                        <StudentEnrollmentDetailPage />
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
                path: ROUTES.assessments.slice(1),
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN']}>
                        <AssessmentsPage />
                    </RoleGate>
                ),
            },
            {
                path: `${ROUTES.assessmentsSection.slice(1)}/:courseSectionId`,
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN']}>
                        <GradebookSectionDetailPage />
                    </RoleGate>
                ),
            },
            {
                path: ROUTES.gradeSummaries.slice(1),
                element: (
                    <RoleGate roles={['SCHOOL_ADMIN']}>
                        <GradeSummariesPage />
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
                path: ROUTES.portalMyClassTimetable.slice(1),
                element: (
                    <RoleGate roles={['STUDENT']}>
                        <PortalMyClassTimetablePage />
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
                path: `${ROUTES.portalMyChildren.slice(1)}/:studentId/scores`,
                element: (
                    <RoleGate roles={['PARENT']}>
                        <PortalChildScoresPage />
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
                path: ROUTES.portalGradebook.slice(1),
                element: (
                    <RoleGate roles={['TEACHER']}>
                        <PortalMyGradebookPage />
                    </RoleGate>
                ),
            },
            {
                path: `${ROUTES.portalGradebook.slice(1)}/select/:courseSectionCode`,
                element: (
                    <RoleGate roles={['TEACHER']}>
                        <PortalMyGradebookSemestersPage />
                    </RoleGate>
                ),
            },
            {
                path: `${ROUTES.portalGradebook.slice(1)}/:courseSectionId`,
                element: (
                    <RoleGate roles={['TEACHER']}>
                        <PortalMyGradebookClassPage />
                    </RoleGate>
                ),
            },
            {
                path: ROUTES.portalMyCourseSections.slice(1),
                element: (
                    <RoleGate roles={['STUDENT']}>
                        <PortalMyCourseSectionsPage />
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
            {
                path: ROUTES.portalHomeroomConduct.slice(1),
                element: (
                    <RoleGate roles={['TEACHER']}>
                        <PortalHomeroomConductPage />
                    </RoleGate>
                ),
            },
            {
                path: ROUTES.portalHomeroomSummaries.slice(1),
                element: (
                    <RoleGate roles={['TEACHER']}>
                        <PortalHomeroomSummariesPage />
                    </RoleGate>
                ),
            },
            {
                path: ROUTES.portalMySummaries.slice(1),
                element: (
                    <RoleGate roles={['STUDENT']}>
                        <PortalMySummariesPage />
                    </RoleGate>
                ),
            },
            {
                path: `${ROUTES.portalMyChildren.slice(1)}/:studentId/summaries`,
                element: (
                    <RoleGate roles={['PARENT']}>
                        <PortalChildSummariesPage />
                    </RoleGate>
                ),
            },
            {
                path: ROUTES.portalMyScores.slice(1),
                element: (
                    <RoleGate roles={['STUDENT']}>
                        <PortalMyScoresPage />
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
