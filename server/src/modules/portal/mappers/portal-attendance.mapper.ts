import type {
  AttendanceRecord,
  AttendanceSession,
  CourseSection,
  HomeroomClass,
  Teacher,
} from '@prisma/client';

import { toIsoDateString } from '../../../common/schemas/academic.schema';

type PortalAttendanceClassRow = {
  id: string;
  courseSection: Pick<CourseSection, 'id' | 'code' | 'name' | 'semesterId'> & {
    homeroomClass: Pick<HomeroomClass, 'id' | 'code' | 'name'> | null;
  };
};

type PortalMyAttendanceRow = AttendanceRecord & {
  session: AttendanceSession & {
    teacher: Pick<Teacher, 'id' | 'fullName'>;
    courseSection: Pick<CourseSection, 'id' | 'code' | 'name'>;
  };
};

export interface PortalAttendanceClassItem {
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
  status: AttendanceRecord['status'];
  note: string | null;
  sessionId: string;
  sessionDate: string;
  periodNumber: number;
  sessionStatus: AttendanceSession['status'];
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  teacherId: string;
  teacherFullName: string;
  createdAt: string;
  updatedAt: string;
}

export function toPortalAttendanceClassItem(
  assignment: PortalAttendanceClassRow,
): PortalAttendanceClassItem {
  return {
    teachingAssignmentId: assignment.id,
    courseSectionId: assignment.courseSection.id,
    courseSectionCode: assignment.courseSection.code,
    courseSectionName: assignment.courseSection.name,
    homeroomClassId: assignment.courseSection.homeroomClass?.id ?? null,
    homeroomClassCode: assignment.courseSection.homeroomClass?.code ?? null,
    homeroomClassName: assignment.courseSection.homeroomClass?.name ?? null,
    semesterId: assignment.courseSection.semesterId,
  };
}

export function toPortalMyAttendanceItem(
  record: PortalMyAttendanceRow,
): PortalMyAttendanceItem {
  return {
    id: record.id,
    status: record.status,
    note: record.note,
    sessionId: record.sessionId,
    sessionDate: toIsoDateString(record.session.sessionDate),
    periodNumber: record.session.periodNumber,
    sessionStatus: record.session.status,
    courseSectionId: record.session.courseSection.id,
    courseSectionCode: record.session.courseSection.code,
    courseSectionName: record.session.courseSection.name,
    teacherId: record.session.teacher.id,
    teacherFullName: record.session.teacher.fullName,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
