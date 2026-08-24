import { AssessmentStatus, PrismaClient, SummaryStatus } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedSummaries } from '../seed-data/summaries';
import { seedYearSummariesForAcademicYear } from '../seed-data/year-complete';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

/**
 * Sửa HK2: tái tính subject results + hạnh kiểm + tổng kết HK từ điểm đã có,
 * khóa sổ OPEN, cập nhật tổng kết năm DRAFT.
 */
const envSchema = z.object({
  SEED_SCHOOL_CODE: z.string().min(1).default('DEMO'),
  SEED_YEAR_CODE: z.string().min(1).default('25-26'),
  SEED_SEMESTER_CODE: z.string().min(1).default('HK2'),
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

    console.log(
      `Repair HK summaries (${academicYear.name} / ${semester.code})...`,
    );

    console.log('1/3 Tái tính tổng kết + hạnh kiểm (DRAFT) từ sổ điểm...');
    const summaries = await seedSummaries(prisma, school.id, semester.id, {
      status: SummaryStatus.DRAFT,
      createYearSummaries: false,
    });
    console.log('  ', summaries);

    console.log('2/3 Khóa sổ điểm OPEN → CLOSED...');
    const locked = await prisma.assessment.updateMany({
      where: {
        schoolId: school.id,
        semesterId: semester.id,
        status: AssessmentStatus.OPEN,
      },
      data: { status: AssessmentStatus.CLOSED },
    });
    console.log('  ', { assessmentsLocked: locked.count });

    console.log('3/3 Cập nhật tổng kết năm (DRAFT)...');
    const yearSummaries = await seedYearSummariesForAcademicYear(
      prisma,
      school.id,
      academicYear.id,
    );
    console.log('  ', yearSummaries);

    const [enroll, conduct, draftSum, withAvg, open] = await Promise.all([
      prisma.studentEnrollment.count({
        where: {
          schoolId: school.id,
          semesterId: semester.id,
          status: 'ACTIVE',
        },
      }),
      prisma.studentConductRecord.count({
        where: { schoolId: school.id, semesterId: semester.id },
      }),
      prisma.studentSemesterSummary.count({
        where: {
          schoolId: school.id,
          semesterId: semester.id,
          status: SummaryStatus.DRAFT,
        },
      }),
      prisma.studentSemesterSummary.count({
        where: {
          schoolId: school.id,
          semesterId: semester.id,
          overallAverage: { not: null },
        },
      }),
      prisma.assessment.count({
        where: {
          schoolId: school.id,
          semesterId: semester.id,
          status: AssessmentStatus.OPEN,
        },
      }),
    ]);

    console.log('Done:', {
      enroll,
      conduct,
      draftSum,
      summariesWithAverage: withAvg,
      openAssessments: open,
    });
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
