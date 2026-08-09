export const ROUTES = {
    login: '/login',
    home: '/',
    users: '/users',
    schoolSettings: '/school-settings',
    academicYears: '/academic-years',
    gradeLevels: '/grade-levels',
    gradeLevelSubjects: '/grade-level-subjects',
    subjects: '/subjects',
    homeroomClasses: '/homeroom-classes',
    courseSections: '/course-sections',
    students: '/students',
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
    portalMySummaries: '/portal/my-summaries',
    portalHomeroomConduct: '/portal/my-homeroom/conduct-records',
    portalHomeroomSummaries: '/portal/my-homeroom/summaries',
} as const;

export function getDefaultRouteForRole(
    role: 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT',
): string {
    switch (role) {
        case 'TEACHER':
        case 'STUDENT':
        case 'PARENT':
            return ROUTES.portal;
        default:
            return ROUTES.home;
    }
}
