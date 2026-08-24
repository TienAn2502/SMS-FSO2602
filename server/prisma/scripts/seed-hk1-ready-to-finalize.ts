import {
  AssessmentStatus,
  EnrollmentStatus,
  PrismaClient,
  SummaryStatus,
} from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedSummaries } from '../seed-data/summaries';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  SEED_SCHOOL_CODE: z.string().min(1).default('DEMO'),
  SEED_YEAR_CODE: z.string().min(1).default('2025-26'),
  SEED_SEMESTER_CODE: z.string().min(1).default('HK1'),
});

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();

  try {
    const school = await prisma.school.findUniqueOrThrow({
      where: { code: env.SEED_SCHOOL_CODE },
    });

    const academicYear = await prisma.academicYear.findFirstOrThrow({
      where: { schoolId: school.id, code: env.SEED_YEAR_CODE },
    });

    const semester = await prisma.semester.findFirstOrThrow({
      where: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        code: env.SEED_SEMESTER_CODE,
      },
    });

    const [homeroomCount, activeEnrollments, draftSummaries, draftConduct] =
      await Promise.all([
        prisma.homeroomClass.count({
          where: {
            schoolId: school.id,
            academicYearId: academicYear.id,
            status: 'ACTIVE',
          },
        }),
        prisma.studentEnrollment.count({
          where: {
            schoolId: school.id,
            semesterId: semester.id,
            status: EnrollmentStatus.ACTIVE,
          },
        }),
        prisma.studentSemesterSummary.count({
          where: {
            schoolId: school.id,
            semesterId: semester.id,
            status: SummaryStatus.DRAFT,
          },
        }),
        prisma.studentConductRecord.count({
          where: {
            schoolId: school.id,
            semesterId: semester.id,
            status: SummaryStatus.DRAFT,
          },
        }),
      ]);

    console.log(
      `Prepare finalize readiness (${academicYear.name} / ${semester.code})...`,
    );
    console.log('Before:', {
      homeroomCount,
      activeEnrollments,
      draftSummaries,
      draftConduct,
    });

    const needsSummaries =
      draftSummaries < activeEnrollments ||
      draftConduct < activeEnrollments;

    if (needsSummaries) {
      console.log('1/2 Tái tính tổng kết + hạnh kiểm (DRAFT)...');
      const summaries = await seedSummaries(prisma, school.id, semester.id, {
        status: SummaryStatus.DRAFT,
        createYearSummaries: false,
      });
      console.log('  ', summaries);
    } else {
      console.log('1/2 Bỏ qua tái tính — đủ tổng kết + hạnh kiểm DRAFT.');
    }

    console.log('2/2 Khóa sổ điểm OPEN → CLOSED...');
    const locked = await prisma.assessment.updateMany({
      where: {
        schoolId: school.id,
        semesterId: semester.id,
        status: AssessmentStatus.OPEN,
      },
      data: { status: AssessmentStatus.CLOSED },
    });

    const [
      openRemaining,
      closedSummaries,
      closedConduct,
      finalDraftSummaries,
      finalDraftConduct,
    ] = await Promise.all([
      prisma.assessment.count({
        where: {
          schoolId: school.id,
          semesterId: semester.id,
          status: AssessmentStatus.OPEN,
        },
      }),
      prisma.studentSemesterSummary.count({
        where: {
          schoolId: school.id,
          semesterId: semester.id,
          status: SummaryStatus.CLOSED,
        },
      }),
      prisma.studentConductRecord.count({
        where: {
          schoolId: school.id,
          semesterId: semester.id,
          status: SummaryStatus.CLOSED,
        },
      }),
      prisma.studentSemesterSummary.count({
        where: {
          schoolId: school.id,
          semesterId: semester.id,
          status: SummaryStatus.DRAFT,
        },
      }),
      prisma.studentConductRecord.count({
        where: {
          schoolId: school.id,
          semesterId: semester.id,
          status: SummaryStatus.DRAFT,
        },
      }),
    ]);

    const ready =
      openRemaining === 0 &&
      closedSummaries === 0 &&
      closedConduct === 0 &&
      finalDraftSummaries >= activeEnrollments &&
      finalDraftConduct >= activeEnrollments;

    console.log('Done:', {
      assessmentsLocked: locked.count,
      openAssessmentsRemaining: openRemaining,
      draftSummaries: finalDraftSummaries,
      draftConduct: finalDraftConduct,
      closedSemesterSummaries: closedSummaries,
      closedConductRecords: closedConduct,
      homeroomsReady: ready
        ? `${homeroomCount}/${homeroomCount}`
        : 'chưa đủ — xem UI',
    });
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
