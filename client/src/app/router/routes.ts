import type { UserRole } from '@/types/api.types';

export const ROUTES = {
    login: '/login',
    home: '/',
    users: '/users',
    schoolSettings: '/school-settings',
    changePassword: '/account/change-password',
    academicYears: '/academic-years',
    gradeLevels: '/grade-levels',
    gradeLevelSubjects: '/grade-level-subjects',
    subjects: '/subjects',
    homeroomClasses: '/homeroom-classes',
    courseSections: '/course-sections',
    students: '/students',
    classPlacement: '/class-placement',
    studentEnrollments: '/student-enrollments',
    teachers: '/teachers',
    teachingAssignments: '/teaching-assignments',
    timetable: '/timetable',
    parents: '/parents',
    portal: '/portal',
    portalMyClass: '/portal/my-class',
    portalMySchedule: '/portal/my-schedule',
    portalMyClassTimetable: '/portal/my-class-timetable',
    portalMyProfile: '/portal/my-profile',
    portalMyChildren: '/portal/my-children',
    portalAttendance: '/portal/attendance',
    portalGradebook: '/portal/gradebook',
    portalMyScores: '/portal/my-scores',
    portalMyAttendance: '/portal/my-attendance',
    portalMyCourseSections: '/portal/my-course-sections',
    attendanceSessions: '/attendance-sessions',
    assessments: '/assessments',
    assessmentsSection: '/assessments/sections',
    gradeSummaries: '/grade-summaries',
    platform: '/platform',
    platformSchools: '/platform/schools',
    portalMySummaries: '/portal/my-summaries',
    portalHomeroomConduct: '/portal/my-homeroom/conduct-records',
    portalHomeroomSummaries: '/portal/my-homeroom/summaries',
} as const;

export function getPlatformSchoolDetailPath(id: string): string {
    return `${ROUTES.platformSchools}/${id}`;
}

export function getDefaultRouteForRole(role: UserRole): string {
    switch (role) {
        case 'SYSTEM_ADMIN':
            return ROUTES.platform;
        case 'TEACHER':
        case 'STUDENT':
        case 'PARENT':
            return ROUTES.portal;
        default:
            return ROUTES.home;
    }
}
