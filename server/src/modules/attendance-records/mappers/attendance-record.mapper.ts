import type { AttendanceRecord, Student } from '@prisma/client';

type AttendanceRecordWithStudent = AttendanceRecord & {
  student: Pick<Student, 'id' | 'fullName'>;
};

export interface AttendanceRecordResponse {
  id: string;
  sessionId: string;
  studentId: string;
  studentFullName: string;
  status: AttendanceRecord['status'];
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export const attendanceRecordInclude = {
  student: {
    select: { id: true, fullName: true },
  },
} as const;

export function toAttendanceRecordResponse(
  record: AttendanceRecordWithStudent,
): AttendanceRecordResponse {
  return {
    id: record.id,
    sessionId: record.sessionId,
    studentId: record.studentId,
    studentFullName: record.student.fullName,
    status: record.status,
    note: record.note,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
