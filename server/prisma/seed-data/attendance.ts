import {
  AttendanceRecordStatus,
  AttendanceSessionStatus,
  EnrollmentStatus,
  PrismaClient,
} from '@prisma/client';

const DEMO_SUBJECT_CODES = ['TOAN', 'VAN', 'ANH'] as const;
const DEMO_HOMEROOM_CODE = '10A1';
const DEMO_SESSION_DATE = new Date('2025-09-01T00:00:00.000Z');

export interface AttendanceSeedResult {
  sessionCount: number;
  recordCount: number;
}

function pickRecordStatus(studentIndex: number): AttendanceRecordStatus {
  const mod = studentIndex % 10;
  if (mod === 0) return AttendanceRecordStatus.ABSENT;
  if (mod === 1) return AttendanceRecordStatus.LATE;
  if (mod === 2) return AttendanceRecordStatus.EXCUSED;
  return AttendanceRecordStatus.PRESENT;
}

export async function seedAttendance(
  prisma: PrismaClient,
  schoolId: string,
  semesterId: string,
): Promise<AttendanceSeedResult> {
  const homeroomClass = await prisma.homeroomClass.findFirst({
    where: { schoolId, code: DEMO_HOMEROOM_CODE },
    select: { id: true, code: true },
  });

  if (!homeroomClass) {
    throw new Error(`Homeroom class ${DEMO_HOMEROOM_CODE} not found for attendance seed`);
  }

  const courseSections = await prisma.courseSection.findMany({
    where: {
      schoolId,
      semesterId,
      homeroomClassId: homeroomClass.id,
      code: {
        in: DEMO_SUBJECT_CODES.map((subject) => `${subject}-${DEMO_HOMEROOM_CODE}`),
      },
    },
    include: {
      teachingAssignments: {
        where: { status: 'ACTIVE' },
        take: 1,
      },
      timetableEntries: {
        where: { status: 'ACTIVE' },
        take: 1,
      },
    },
    orderBy: { code: 'asc' },
  });

  if (courseSections.length === 0) {
    throw new Error('No demo course sections found for attendance seed');
  }

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolId,
      semesterId,
      homeroomClassId: homeroomClass.id,
      status: EnrollmentStatus.ACTIVE,
    },
    select: { studentId: true },
    orderBy: { enrolledAt: 'asc' },
  });

  if (enrollments.length === 0) {
    throw new Error('No active enrollments found for attendance seed');
  }

  let sessionCount = 0;
  let recordCount = 0;

  for (const section of courseSections) {
    const assignment = section.teachingAssignments[0];
    if (!assignment) {
      continue;
    }

    const timetableEntry = section.timetableEntries[0];
    const periodNumber = timetableEntry?.periodNumber ?? 1;

    const session = await prisma.attendanceSession.create({
      data: {
        schoolId,
        semesterId,
        courseSectionId: section.id,
        teacherId: assignment.teacherId,
        timetableEntryId: timetableEntry?.id ?? null,
        sessionDate: DEMO_SESSION_DATE,
        periodNumber,
        status: AttendanceSessionStatus.CLOSED,
        note: `Điểm danh demo ${section.code} — ${DEMO_SESSION_DATE.toISOString().slice(0, 10)}`,
      },
    });

    sessionCount += 1;

    const records = await prisma.attendanceRecord.createMany({
      data: enrollments.map((enrollment, index) => ({
        schoolId,
        sessionId: session.id,
        studentId: enrollment.studentId,
        status: pickRecordStatus(index),
      })),
    });

    recordCount += records.count;
  }

  return { sessionCount, recordCount };
}
