import {
  AcademicEntityStatus,
  AttendanceRecordStatus,
  AttendanceSessionStatus,
  EnrollmentStatus,
  PrismaClient,
} from '@prisma/client';

import { GRADEBOOK_ENROLLMENT_STATUSES } from '../../src/common/utils/enrollment-status.util';

const DEMO_SUBJECT_CODES = ['TOAN', 'VAN', 'ANH'] as const;
const DEMO_HOMEROOM_CODE = '10A1';
const DEMO_SESSION_DATE = new Date('2025-09-01T00:00:00.000Z');

/** Số tuần điểm danh mẫu / lớp môn (theo slot TKB). */
const DEFAULT_ATTENDANCE_WEEKS = 12;

const BATCH_SIZE = 100;

export interface AttendanceSeedResult {
  sessionCount: number;
  recordCount: number;
}

export interface AttendanceSemesterSeedResult extends AttendanceSeedResult {
  courseSectionCount: number;
  skippedSectionCount: number;
}

function pickRecordStatus(studentIndex: number): AttendanceRecordStatus {
  const mod = studentIndex % 10;
  if (mod === 0) return AttendanceRecordStatus.ABSENT;
  if (mod === 1) return AttendanceRecordStatus.LATE;
  if (mod === 2) return AttendanceRecordStatus.EXCUSED;
  return AttendanceRecordStatus.PRESENT;
}

function pickRealisticRecordStatus(
  studentId: string,
  sessionDate: Date,
  studentIndex: number,
): AttendanceRecordStatus {
  const dayKey = sessionDate.toISOString().slice(0, 10);
  const hash =
    (studentId.charCodeAt(0) +
      studentId.charCodeAt(8) +
      dayKey.charCodeAt(5) +
      studentIndex * 3) %
    100;

  if (hash < 4) return AttendanceRecordStatus.ABSENT;
  if (hash < 9) return AttendanceRecordStatus.LATE;
  if (hash < 12) return AttendanceRecordStatus.EXCUSED;
  return AttendanceRecordStatus.PRESENT;
}

function getWeeklySessionDates(
  semesterStart: Date,
  semesterEnd: Date,
  dayOfWeek: number,
  maxSessions: number,
): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(semesterStart);

  while (cursor.getUTCDay() !== dayOfWeek && cursor <= semesterEnd) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  while (cursor <= semesterEnd && dates.length < maxSessions) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return dates;
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

export async function seedAttendanceForSemester(
  prisma: PrismaClient,
  schoolId: string,
  semesterId: string,
  options?: { weeks?: number; replaceExisting?: boolean },
): Promise<AttendanceSemesterSeedResult> {
  const weeks = options?.weeks ?? DEFAULT_ATTENDANCE_WEEKS;

  const semester = await prisma.semester.findFirstOrThrow({
    where: { id: semesterId, schoolId },
    select: { startDate: true, endDate: true },
  });

  if (options?.replaceExisting) {
    await prisma.attendanceRecord.deleteMany({
      where: { schoolId, session: { semesterId } },
    });
    await prisma.attendanceSession.deleteMany({
      where: { schoolId, semesterId },
    });
  }

  const courseSections = await prisma.courseSection.findMany({
    where: {
      schoolId,
      semesterId,
      status: AcademicEntityStatus.ACTIVE,
      homeroomClassId: { not: null },
    },
    include: {
      teachingAssignments: {
        where: { status: AcademicEntityStatus.ACTIVE },
        take: 1,
      },
      timetableEntries: {
        where: { status: AcademicEntityStatus.ACTIVE },
        take: 1,
      },
    },
    orderBy: { code: 'asc' },
  });

  if (courseSections.length === 0) {
    throw new Error('No course sections found for attendance semester seed');
  }

  let sessionCount = 0;
  let recordCount = 0;
  let skippedSectionCount = 0;

  for (const section of courseSections) {
    const assignment = section.teachingAssignments[0];
    const timetableEntry = section.timetableEntries[0];

    if (!assignment || !timetableEntry || !section.homeroomClassId) {
      skippedSectionCount += 1;
      continue;
    }

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId,
        homeroomClassId: section.homeroomClassId,
        status: { in: GRADEBOOK_ENROLLMENT_STATUSES },
      },
      select: { studentId: true },
      orderBy: { enrolledAt: 'asc' },
    });

    if (enrollments.length === 0) {
      skippedSectionCount += 1;
      continue;
    }

    const sessionDates = getWeeklySessionDates(
      semester.startDate,
      semester.endDate,
      timetableEntry.dayOfWeek,
      weeks,
    );

    for (const sessionDate of sessionDates) {
      if (!options?.replaceExisting) {
        const existing = await prisma.attendanceSession.findFirst({
          where: {
            courseSectionId: section.id,
            sessionDate,
            periodNumber: timetableEntry.periodNumber,
          },
          select: { id: true },
        });

        if (existing) {
          continue;
        }
      }

      const session = await prisma.attendanceSession.create({
        data: {
          schoolId,
          semesterId,
          courseSectionId: section.id,
          teacherId: assignment.teacherId,
          timetableEntryId: timetableEntry.id,
          sessionDate,
          periodNumber: timetableEntry.periodNumber,
          status: AttendanceSessionStatus.CLOSED,
          note: null,
        },
      });

      sessionCount += 1;

      for (let i = 0; i < enrollments.length; i += BATCH_SIZE) {
        const batch = enrollments.slice(i, i + BATCH_SIZE);
        const created = await prisma.attendanceRecord.createMany({
          data: batch.map((enrollment, index) => ({
            schoolId,
            sessionId: session.id,
            studentId: enrollment.studentId,
            status: pickRealisticRecordStatus(
              enrollment.studentId,
              sessionDate,
              i + index,
            ),
          })),
        });
        recordCount += created.count;
      }
    }
  }

  return {
    sessionCount,
    recordCount,
    courseSectionCount: courseSections.length,
    skippedSectionCount,
  };
}
