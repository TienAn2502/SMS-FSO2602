import { AssessmentStatus, PrismaClient, SummaryStatus } from '@prisma/client';
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

    console.log(
      `Repair HK summaries + conduct (${academicYear.name} / ${semester.code})...`,
    );

    console.log('1/2 Tái tính tổng kết + hạnh kiểm HK (DRAFT)...');
    const summaries = await seedSummaries(prisma, school.id, semester.id, {
      status: SummaryStatus.DRAFT,
      createYearSummaries: false,
    });
    console.log('  ', summaries);

    console.log('2/2 Khóa sổ điểm OPEN → CLOSED...');
    const locked = await prisma.assessment.updateMany({
      where: {
        schoolId: school.id,
        semesterId: semester.id,
        status: AssessmentStatus.OPEN,
      },
      data: { status: AssessmentStatus.CLOSED },
    });
    console.log('  ', { assessmentsLocked: locked.count });

    console.log('Done.');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
