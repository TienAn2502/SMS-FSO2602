import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { backfillGradeLevelSubjectPeriods } from '../seed-data/backfill-periods-per-year';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  SEED_SCHOOL_CODE: z.string().min(1),
});

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();

  try {
    const school = await prisma.school.findUniqueOrThrow({
      where: { code: env.SEED_SCHOOL_CODE },
    });

    const updated = await backfillGradeLevelSubjectPeriods(prisma, school.id);
    console.log(
      `Backfill grade_level_subjects: ${updated} rows (${school.code}) — periods_per_year + evaluation_mode`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
