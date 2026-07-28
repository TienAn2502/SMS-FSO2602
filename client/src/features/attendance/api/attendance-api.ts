import { api } from '@/lib/api';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '@/types/api.types';

export type AttendanceSessionStatus = 'OPEN' | 'CLOSED';
export type AttendanceRecordStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceSession {
  id: string;
  semesterId: string;
  semesterName: string;
  academicYearId: string;
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  homeroomClassId: string | null;
  teacherId: string;
  teacherFullName: string;
  timetableEntryId: string | null;
  sessionDate: string;
  periodNumber: number;
  status: AttendanceSessionStatus;
  note: string | null;
  recordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecordSummary {
  id: string;
  studentId: string;
  studentFullName: string;
  status: AttendanceRecordStatus;
  note: string | null;
}

export interface AttendanceSessionDetail extends AttendanceSession {
  records: AttendanceRecordSummary[];
}

export interface ListAttendanceSessionsParams {
  page?: number;
  limit?: number;
  courseSectionId?: string;
  teacherId?: string;
  sessionDate?: string;
  status?: AttendanceSessionStatus;
  includeAllSemesters?: boolean;
}

export interface CreateAttendanceSessionInput {
  courseSectionId: string;
  teacherId: string;
  sessionDate: string;
  periodNumber: number;
  timetableEntryId?: string;
  note?: string;
}

export interface BulkUpsertRecordsInput {
  records: Array<{
    studentId: string;
    status: AttendanceRecordStatus;
    note?: string | null;
  }>;
  initMissingStudents?: boolean;
}

export async function fetchAttendanceSessions(params: ListAttendanceSessionsParams = {}) {
  const { data } = await api.get<ApiPaginatedResponse<AttendanceSession>>(
    '/attendance-sessions',
    { params },
  );
  return data;
}

export async function fetchAttendanceSession(id: string) {
  const { data } = await api.get<ApiSuccessResponse<AttendanceSessionDetail>>(
    `/attendance-sessions/${id}`,
  );
  return data.data;
}

export async function createAttendanceSession(input: CreateAttendanceSessionInput) {
  const { data } = await api.post<ApiSuccessResponse<AttendanceSession>>(
    '/attendance-sessions',
    input,
  );
  return data.data;
}

export async function updateAttendanceSession(
  id: string,
  input: { status?: AttendanceSessionStatus; note?: string | null },
) {
  const { data } = await api.patch<ApiSuccessResponse<AttendanceSession>>(
    `/attendance-sessions/${id}`,
    input,
  );
  return data.data;
}

export async function bulkUpsertAttendanceRecords(
  sessionId: string,
  input: BulkUpsertRecordsInput,
) {
  const { data } = await api.put<ApiSuccessResponse<AttendanceSessionDetail>>(
    `/attendance-sessions/${sessionId}/records`,
    input,
  );
  return data.data;
}

export async function updateAttendanceRecord(
  id: string,
  input: { status?: AttendanceRecordStatus; note?: string | null },
) {
  const { data } = await api.patch<
    ApiSuccessResponse<{
      id: string;
      sessionId: string;
      studentId: string;
      studentFullName: string;
      status: AttendanceRecordStatus;
      note: string | null;
    }>
  >(`/attendance-records/${id}`, input);
  return data.data;
}
