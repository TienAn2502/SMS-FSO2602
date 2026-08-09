import type {
  AttendanceRecord,
  AttendanceSession,
  CourseSection,
  Semester,
  Student,
  Teacher,
} from '@prisma/client';

import { toIsoDateString } from '@/common/schemas/academic.schema';

type AttendanceRecordWithStudent = AttendanceRecord & {
  student: Pick<Student, 'id' | 'fullName'>;
};

type AttendanceSessionWithRelations = AttendanceSession & {
  teacher: Pick<Teacher, 'id' | 'fullName'>;
  courseSection: Pick<CourseSection, 'id' | 'code' | 'name' | 'homeroomClassId'> & {
    semester: Pick<Semester, 'id' | 'name' | 'code' | 'academicYearId'>;
  };
  records?: AttendanceRecordWithStudent[];
  _count?: { records: number };
};

export interface AttendanceRecordSummary {
  id: string;
  studentId: string;
  studentFullName: string;
  status: AttendanceRecord['status'];
  note: string | null;
}

export interface AttendanceSessionResponse {
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
  status: AttendanceSession['status'];
  note: string | null;
  recordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSessionDetailResponse extends AttendanceSessionResponse {
  records: AttendanceRecordSummary[];
}

export const attendanceSessionInclude = {
  teacher: {
    select: { id: true, fullName: true },
  },
  courseSection: {
    select: {
      id: true,
      code: true,
      name: true,
      homeroomClassId: true,
      semester: {
        select: { id: true, name: true, code: true, academicYearId: true },
      },
    },
  },
  _count: {
    select: { records: true },
  },
} as const;

export const attendanceSessionDetailInclude = {
  ...attendanceSessionInclude,
  records: {
    orderBy: { student: { fullName: 'asc' as const } },
    include: {
      student: {
        select: { id: true, fullName: true },
      },
    },
  },
} as const;

function toRecordSummary(
  record: AttendanceRecordWithStudent,
): AttendanceRecordSummary {
  return {
    id: record.id,
    studentId: record.studentId,
    studentFullName: record.student.fullName,
    status: record.status,
    note: record.note,
  };
}

export function toAttendanceSessionResponse(
  session: AttendanceSessionWithRelations,
): AttendanceSessionResponse {
  return {
    id: session.id,
    semesterId: session.semesterId,
    semesterName: session.courseSection.semester.name,
    academicYearId: session.courseSection.semester.academicYearId,
    courseSectionId: session.courseSectionId,
    courseSectionCode: session.courseSection.code,
    courseSectionName: session.courseSection.name,
    homeroomClassId: session.courseSection.homeroomClassId,
    teacherId: session.teacherId,
    teacherFullName: session.teacher.fullName,
    timetableEntryId: session.timetableEntryId,
    sessionDate: toIsoDateString(session.sessionDate),
    periodNumber: session.periodNumber,
    status: session.status,
    note: session.note,
    recordCount: session._count?.records ?? session.records?.length ?? 0,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export function toAttendanceSessionDetailResponse(
  session: AttendanceSessionWithRelations,
): AttendanceSessionDetailResponse {
  return {
    ...toAttendanceSessionResponse(session),
    records: (session.records ?? []).map(toRecordSummary),
  };
}
