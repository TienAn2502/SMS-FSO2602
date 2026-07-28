import { api } from '@/lib/api';
import type { ApiPaginatedResponse, ApiSuccessResponse, UserRole } from '@/types/api.types';

import type {
  AttendanceSession,
  AttendanceSessionDetail,
} from '@/features/attendance/api/attendance-api';

import type { Student } from '@/features/students/api/students-api';
import type { TeachingAssignment } from '@/features/teaching-assignments/api/teaching-assignments-api';
import type { TimetableEntry } from '@/features/timetable/api/timetable-entries-api';
import type { HomeroomClass } from '@/features/homeroom-classes/api/homeroom-classes-api';
import type { StudentEnrollmentSummary } from '@/features/students/api/students-api';
import type { LinkedStudentSummary, ParentRelationship } from '@/features/parents/api/parents-api';

export interface PortalMeResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
  };
  activeSchoolId: string;
  teacher?: {
    id: string;
    fullName: string;
    specialization: string | null;
    phone: string | null;
    status: string;
  };
  student?: Student;
  parent?: {
    id: string;
    fullName: string;
    phone: string | null;
    status: string;
    linkedStudents: LinkedStudentSummary[];
  };
}

export interface PortalChild {
  linkId: string;
  relationship: ParentRelationship;
  isPrimaryContact: boolean;
  student: Student;
}

export async function fetchPortalMe(): Promise<PortalMeResponse> {
  const { data } = await api.get<ApiSuccessResponse<PortalMeResponse>>('/portal/me');
  return data.data;
}

export async function fetchMyHomeroomClasses(): Promise<HomeroomClass[]> {
  const { data } = await api.get<ApiSuccessResponse<HomeroomClass[]>>(
    '/portal/my-homeroom-classes',
  );
  return data.data;
}

export async function fetchMyHomeroomClassStudents(classId: string) {
  const { data } = await api.get<
    ApiSuccessResponse<
      Array<
        StudentEnrollmentSummary & {
          id: string;
          studentId: string;
          studentFullName: string;
        }
      >
    >
  >(`/portal/my-homeroom-classes/${classId}/students`);
  return data.data;
}

export async function fetchMyTeachingAssignments(): Promise<TeachingAssignment[]> {
  const { data } = await api.get<ApiSuccessResponse<TeachingAssignment[]>>(
    '/portal/my-teaching-assignments',
  );
  return data.data;
}

export async function fetchMyTimetable(params?: {
  semesterId?: string;
  includeAllSemesters?: boolean;
}): Promise<TimetableEntry[]> {
  const { data } = await api.get<ApiSuccessResponse<TimetableEntry[]>>(
    '/portal/my-timetable',
    { params },
  );
  return data.data;
}

export async function fetchMyStudentProfile(): Promise<Student> {
  const { data } = await api.get<ApiSuccessResponse<Student>>(
    '/portal/my-student-profile',
  );
  return data.data;
}

export interface ClassTimetableResponse {
  homeroomClass: { id: string; code: string; name: string } | null;
  semester: { id: string; code: string; name: string } | null;
  entries: TimetableEntry[];
}

export async function fetchMyClassTimetable(params?: {
  semesterId?: string;
  includeAllSemesters?: boolean;
}): Promise<ClassTimetableResponse> {
  const { data } = await api.get<ApiSuccessResponse<ClassTimetableResponse>>(
    '/portal/my-class-timetable',
    { params },
  );
  return data.data;
}

export async function fetchMyChildren(): Promise<PortalChild[]> {
  const { data } = await api.get<ApiSuccessResponse<PortalChild[]>>(
    '/portal/my-children',
  );
  return data.data;
}

export interface PortalAttendanceClass {
  teachingAssignmentId: string;
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  homeroomClassId: string | null;
  homeroomClassCode: string | null;
  homeroomClassName: string | null;
  semesterId: string;
}

export interface PortalMyAttendanceItem {
  id: string;
  status: string;
  note: string | null;
  sessionId: string;
  sessionDate: string;
  periodNumber: number;
  sessionStatus: string;
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  teacherId: string;
  teacherFullName: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchMyAttendanceClasses(): Promise<PortalAttendanceClass[]> {
  const { data } = await api.get<ApiSuccessResponse<PortalAttendanceClass[]>>(
    '/portal/my-attendance-classes',
  );
  return data.data;
}

export async function fetchPortalAttendanceSession(sessionId: string) {
  const { data } = await api.get<ApiSuccessResponse<AttendanceSessionDetail>>(
    `/portal/attendance-sessions/${sessionId}`,
  );
  return data.data;
}

export async function createPortalAttendanceSession(input: {
  courseSectionId: string;
  sessionDate: string;
  periodNumber: number;
  timetableEntryId?: string;
  note?: string;
}) {
  const { data } = await api.post<ApiSuccessResponse<AttendanceSession>>(
    '/portal/attendance-sessions',
    input,
  );
  return data.data;
}

export async function bulkUpsertPortalAttendanceRecords(
  sessionId: string,
  input: {
    records: Array<{ studentId: string; status: string; note?: string | null }>;
    initMissingStudents?: boolean;
  },
) {
  const { data } = await api.put<ApiSuccessResponse<AttendanceSessionDetail>>(
    `/portal/attendance-sessions/${sessionId}/records`,
    input,
  );
  return data.data;
}

export async function closePortalAttendanceSession(
  sessionId: string,
  note?: string | null,
) {
  const { data } = await api.patch<ApiSuccessResponse<AttendanceSession>>(`/portal/attendance-sessions/${sessionId}`, {
    status: 'CLOSED',
    note: note ?? null,
  });
  return data.data;
}

export async function fetchMyAttendance(params?: {
  page?: number;
  limit?: number;
  semesterId?: string;
  includeAllSemesters?: boolean;
}) {
  const { data } = await api.get<ApiPaginatedResponse<PortalMyAttendanceItem>>(
    '/portal/my-attendance',
    { params },
  );
  return data;
}

export async function fetchMyChildAttendance(
  studentId: string,
  params?: {
    page?: number;
    limit?: number;
    semesterId?: string;
    includeAllSemesters?: boolean;
  },
) {
  const { data } = await api.get<ApiPaginatedResponse<PortalMyAttendanceItem>>(
    `/portal/my-children/${studentId}/attendance`,
    { params },
  );
  return data;
}
