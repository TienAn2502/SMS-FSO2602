export const ROUTES = {
  login: '/login',
  home: '/',
  users: '/users',
  schoolSettings: '/school-settings',
  academicYears: '/academic-years',
  gradeLevels: '/grade-levels',
  subjects: '/subjects',
  homeroomClasses: '/homeroom-classes',
  courseSections: '/course-sections',
  students: '/students',
  teachers: '/teachers',
  teachingAssignments: '/teaching-assignments',
  timetable: '/timetable',
  parents: '/parents',
  portal: '/portal',
  portalMyClass: '/portal/my-class',
  portalMySchedule: '/portal/my-schedule',
  portalMyProfile: '/portal/my-profile',
  portalMyChildren: '/portal/my-children',
  portalAttendance: '/portal/attendance',
  portalMyAttendance: '/portal/my-attendance',
  attendanceSessions: '/attendance-sessions',
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
