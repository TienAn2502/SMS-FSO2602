import {
  EnrollmentStatus,
  PrismaClient,
  SummaryStatus,
} from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const DEFAULT_HK2_SEMESTER_ID = '724c2b21-cb2b-45ce-93fe-a28393d7efe2';

const envSchema = z.object({
  CLEAR_SEMESTER_ID: z.string().uuid().optional(),
  CLEAR_SEMESTER_CODE: z.string().optional(),
  KEEP_SEMESTER_RECORD: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export interface ClearSemesterDataResult {
  semesterId: string;
  semesterCode: string;
  academicYearId: string;
  restoredCurrentSemesterId: string | null;
  restoredCurrentSemesterCode: string | null;
  reactivatedEnrollmentCount: number;
  deleted: {
    scores: number;
    assessments: number;
    attendanceRecords: number;
    attendanceSessions: number;
    studentSubjectResults: number;
    studentConductRecords: number;
    studentSemesterSummaries: number;
    timetableEntries: number;
    teachingAssignments: number;
    courseSections: number;
    studentEnrollments: number;
    draftYearSummaries: number;
    semesterRecord: number;
  };
}

export async function clearSemesterData(
  prisma: PrismaClient,
  semesterId: string,
  options?: { keepSemesterRecord?: boolean },
): Promise<ClearSemesterDataResult> {
  const semester = await prisma.semester.findUniqueOrThrow({
    where: { id: semesterId },
    select: {
      id: true,
      code: true,
      schoolId: true,
      academicYearId: true,
    },
  });

  const hk1 = await prisma.semester.findFirst({
    where: {
      schoolId: semester.schoolId,
      academicYearId: semester.academicYearId,
      code: 'HK1',
    },
    select: { id: true, code: true },
  });

  const courseSectionIds = (
    await prisma.courseSection.findMany({
      where: { schoolId: semester.schoolId, semesterId: semester.id },
      select: { id: true },
    })
  ).map((row) => row.id);

  const assessmentIds = (
    await prisma.assessment.findMany({
      where: { schoolId: semester.schoolId, semesterId: semester.id },
      select: { id: true },
    })
  ).map((row) => row.id);

  const sessionIds = (
    await prisma.attendanceSession.findMany({
      where: { schoolId: semester.schoolId, semesterId: semester.id },
      select: { id: true },
    })
  ).map((row) => row.id);

  const deleted = {
    scores: 0,
    assessments: 0,
    attendanceRecords: 0,
    attendanceSessions: 0,
    studentSubjectResults: 0,
    studentConductRecords: 0,
    studentSemesterSummaries: 0,
    timetableEntries: 0,
    teachingAssignments: 0,
    courseSections: 0,
    studentEnrollments: 0,
    draftYearSummaries: 0,
    semesterRecord: 0,
  };

  await prisma.$transaction(async (tx) => {
    if (assessmentIds.length > 0) {
      const scores = await tx.score.deleteMany({
        where: { assessmentId: { in: assessmentIds } },
      });
      deleted.scores = scores.count;
    }

    if (sessionIds.length > 0) {
      const records = await tx.attendanceRecord.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      deleted.attendanceRecords = records.count;
    }

    const [
      assessments,
      sessions,
      subjectResults,
      conductRecords,
      semesterSummaries,
      timetableEntries,
      teachingAssignments,
      courseSections,
      enrollments,
      draftYearSummaries,
    ] = await Promise.all([
      tx.assessment.deleteMany({
        where: { schoolId: semester.schoolId, semesterId: semester.id },
      }),
      tx.attendanceSession.deleteMany({
        where: { schoolId: semester.schoolId, semesterId: semester.id },
      }),
      tx.studentSubjectResult.deleteMany({
        where: { schoolId: semester.schoolId, semesterId: semester.id },
      }),
      tx.studentConductRecord.deleteMany({
        where: { schoolId: semester.schoolId, semesterId: semester.id },
      }),
      tx.studentSemesterSummary.deleteMany({
        where: { schoolId: semester.schoolId, semesterId: semester.id },
      }),
      tx.timetableEntry.deleteMany({
        where: { schoolId: semester.schoolId, semesterId: semester.id },
      }),
      courseSectionIds.length > 0
        ? tx.teachingAssignment.deleteMany({
            where: { courseSectionId: { in: courseSectionIds } },
          })
        : Promise.resolve({ count: 0 }),
      tx.courseSection.deleteMany({
        where: { schoolId: semester.schoolId, semesterId: semester.id },
      }),
      tx.studentEnrollment.deleteMany({
        where: { schoolId: semester.schoolId, semesterId: semester.id },
      }),
      tx.studentYearSummary.deleteMany({
        where: {
          schoolId: semester.schoolId,
          academicYearId: semester.academicYearId,
          status: SummaryStatus.DRAFT,
        },
      }),
    ]);

    deleted.assessments = assessments.count;
    deleted.attendanceSessions = sessions.count;
    deleted.studentSubjectResults = subjectResults.count;
    deleted.studentConductRecords = conductRecords.count;
    deleted.studentSemesterSummaries = semesterSummaries.count;
    deleted.timetableEntries = timetableEntries.count;
    deleted.teachingAssignments = teachingAssignments.count;
    deleted.courseSections = courseSections.count;
    deleted.studentEnrollments = enrollments.count;
    deleted.draftYearSummaries = draftYearSummaries.count;

    await tx.semester.updateMany({
      where: { schoolId: semester.schoolId, isCurrent: true },
      data: { isCurrent: false },
    });

    if (hk1) {
      await tx.semester.update({
        where: { id: hk1.id },
        data: { isCurrent: true, status: 'ACTIVE' },
      });
    }

    if (!options?.keepSemesterRecord) {
      const removed = await tx.semester.deleteMany({
        where: { id: semester.id },
      });
      deleted.semesterRecord = removed.count;
    }
  });

  let reactivatedEnrollmentCount = 0;

  if (hk1) {
    const reactivated = await prisma.studentEnrollment.updateMany({
      where: {
        schoolId: semester.schoolId,
        semesterId: hk1.id,
        status: EnrollmentStatus.SEMESTER_COMPLETED,
      },
      data: {
        status: EnrollmentStatus.ACTIVE,
        leftAt: null,
      },
    });
    reactivatedEnrollmentCount = reactivated.count;
  }

  return {
    semesterId: semester.id,
    semesterCode: semester.code,
    academicYearId: semester.academicYearId,
    restoredCurrentSemesterId: hk1?.id ?? null,
    restoredCurrentSemesterCode: hk1?.code ?? null,
    reactivatedEnrollmentCount,
    deleted,
  };
}

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();

  try {
    let semesterId = env.CLEAR_SEMESTER_ID ?? DEFAULT_HK2_SEMESTER_ID;

    if (env.CLEAR_SEMESTER_CODE) {
      const semester = await prisma.semester.findFirst({
        where: { code: env.CLEAR_SEMESTER_CODE },
        orderBy: { createdAt: 'desc' },
      });
      if (!semester) {
        throw new Error(`Semester code ${env.CLEAR_SEMESTER_CODE} not found`);
      }
      semesterId = semester.id;
    }

    const target = await prisma.semester.findUniqueOrThrow({
      where: { id: semesterId },
      include: { academicYear: true },
    });

    console.log(
      `Clearing ${target.code} data (${target.academicYear.name}, ${semesterId})...`,
    );

    const result = await clearSemesterData(prisma, semesterId, {
      keepSemesterRecord: env.KEEP_SEMESTER_RECORD ?? false,
    });

    console.log('Done:', result);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('Clear semester data failed:', error);
    process.exit(1);
  });
}
