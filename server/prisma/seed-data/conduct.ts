import {
  EnrollmentStatus,
  PrismaClient,
  SummaryStatus,
  TrainingResultLevel,
} from '@prisma/client';

export interface ConductSeedResult {
  conductRecordCount: number;
  homeroomClassCount: number;
  studentCount: number;
  status: SummaryStatus;
}

const SEED_ENROLLMENT_STATUSES = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.SEMESTER_COMPLETED,
] as const;

const TRAINING_LEVELS = [
  TrainingResultLevel.GOOD,
  TrainingResultLevel.FAIR,
  TrainingResultLevel.SATISFACTORY,
  TrainingResultLevel.UNSATISFACTORY,
] as const;

export function resolveSeedTrainingResultLevel(
  studentIndex: number,
): TrainingResultLevel {
  return (
    TRAINING_LEVELS[studentIndex % TRAINING_LEVELS.length] ??
    TrainingResultLevel.GOOD
  );
}

export async function upsertStudentConductRecord(
  prisma: PrismaClient,
  params: {
    schoolId: string;
    studentId: string;
    semesterId: string;
    homeroomClassId: string;
    homeroomTeacherId: string | null;
    studentIndex: number;
    status?: SummaryStatus;
  },
): Promise<void> {
  const trainingResultLevel = resolveSeedTrainingResultLevel(params.studentIndex);

  await prisma.studentConductRecord.upsert({
    where: {
      studentId_semesterId: {
        studentId: params.studentId,
        semesterId: params.semesterId,
      },
    },
    create: {
      schoolId: params.schoolId,
      studentId: params.studentId,
      semesterId: params.semesterId,
      homeroomClassId: params.homeroomClassId,
      trainingResultLevel,
      note:
        trainingResultLevel === TrainingResultLevel.GOOD
          ? 'Chấp hành tốt nội quy'
          : null,
      recordedByTeacherId: params.homeroomTeacherId,
      status: params.status ?? SummaryStatus.DRAFT,
    },
    update: {
      homeroomClassId: params.homeroomClassId,
      trainingResultLevel,
      note:
        trainingResultLevel === TrainingResultLevel.GOOD
          ? 'Chấp hành tốt nội quy'
          : null,
      recordedByTeacherId: params.homeroomTeacherId,
      ...(params.status ? { status: params.status } : {}),
    },
  });
}

export async function seedConductForSemester(
  prisma: PrismaClient,
  schoolId: string,
  semesterId: string,
  options: { status?: SummaryStatus; replaceExisting?: boolean } = {},
): Promise<ConductSeedResult> {
  const status = options.status ?? SummaryStatus.DRAFT;

  if (options.replaceExisting) {
    await prisma.studentConductRecord.deleteMany({
      where: { schoolId, semesterId },
    });
  }

  const homeroomClasses = await prisma.homeroomClass.findMany({
    where: {
      schoolId,
      studentEnrollments: {
        some: {
          semesterId,
          status: { in: [...SEED_ENROLLMENT_STATUSES] },
        },
      },
    },
    select: {
      id: true,
      homeroomTeacherId: true,
    },
    orderBy: { code: 'asc' },
  });

  if (homeroomClasses.length === 0) {
    throw new Error('No homeroom classes with enrollments found for conduct seed');
  }

  let conductRecordCount = 0;
  let studentCount = 0;

  for (const homeroomClass of homeroomClasses) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId,
        homeroomClassId: homeroomClass.id,
        status: { in: [...SEED_ENROLLMENT_STATUSES] },
      },
      select: { studentId: true },
      orderBy: { enrolledAt: 'asc' },
    });

    for (const [index, enrollment] of enrollments.entries()) {
      await upsertStudentConductRecord(prisma, {
        schoolId,
        studentId: enrollment.studentId,
        semesterId,
        homeroomClassId: homeroomClass.id,
        homeroomTeacherId: homeroomClass.homeroomTeacherId,
        studentIndex: index,
        status,
      });
      conductRecordCount += 1;
    }

    studentCount += enrollments.length;
  }

  return {
    conductRecordCount,
    homeroomClassCount: homeroomClasses.length,
    studentCount,
    status,
  };
}
