import { SummaryStatus } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';

import { seedYearSummariesForAcademicYear } from '../seed-data/year-complete';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const SCHOOL_CODE = process.env.SEED_SCHOOL_CODE ?? 'DEMO';

async function main(): Promise<void> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const school = await prisma.school.findUniqueOrThrow({
      where: { code: SCHOOL_CODE },
    });

    const year = await prisma.academicYear.findFirstOrThrow({
      where: { schoolId: school.id, isCurrent: true },
    });

    console.log(`Repair year summaries: ${school.code} / ${year.name}`);

    await prisma.studentYearSummary.deleteMany({
      where: {
        schoolId: school.id,
        academicYearId: year.id,
        status: SummaryStatus.DRAFT,
      },
    });

    const result = await seedYearSummariesForAcademicYear(
      prisma,
      school.id,
      year.id,
    );

    console.log('Done:', result);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
