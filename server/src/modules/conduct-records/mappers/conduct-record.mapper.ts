import type { Prisma, StudentConductRecord } from '@prisma/client';

export const conductRecordListInclude = {
  student: {
    select: {
      id: true,
      fullName: true,
    },
  },
  semester: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  homeroomClass: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  recordedByTeacher: {
    select: {
      id: true,
      fullName: true,
    },
  },
} satisfies Prisma.StudentConductRecordInclude;

export type ConductRecordListRow = Prisma.StudentConductRecordGetPayload<{
  include: typeof conductRecordListInclude;
}>;

export interface ConductRecordResponse {
  id: string;
  studentId: string;
  studentFullName: string;
  semesterId: string;
  semesterName: string;
  homeroomClassId: string;
  homeroomClassCode: string;
  trainingResultLevel: ConductRecordListRow['trainingResultLevel'];
  note: string | null;
  recordedByTeacherId: string | null;
  recordedByTeacherName: string | null;
  status: ConductRecordListRow['status'];
  createdAt: string;
  updatedAt: string;
}

export function toConductRecordResponse(
  row: ConductRecordListRow,
): ConductRecordResponse {
  return {
    id: row.id,
    studentId: row.studentId,
    studentFullName: row.student.fullName,
    semesterId: row.semesterId,
    semesterName: row.semester.name,
    homeroomClassId: row.homeroomClassId,
    homeroomClassCode: row.homeroomClass.code,
    trainingResultLevel: row.trainingResultLevel,
    note: row.note,
    recordedByTeacherId: row.recordedByTeacherId,
    recordedByTeacherName: row.recordedByTeacher?.fullName ?? null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
