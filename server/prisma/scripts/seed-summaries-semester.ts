import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedSummaries } from '../seed-data/summaries';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const DEFAULT_HK2_SEMESTER_ID = '724c2b21-cb2b-45ce-93fe-a28393d7efe2';

const envSchema = z.object({
  SEED_SUMMARIES_SEMESTER_ID: z.string().uuid().optional(),
});

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const semesterId = env.SEED_SUMMARIES_SEMESTER_ID ?? DEFAULT_HK2_SEMESTER_ID;
  const prisma = new PrismaClient();

  try {
    const semester = await prisma.semester.findUniqueOrThrow({
      where: { id: semesterId },
      include: { academicYear: true },
    });

    console.log(
      `Seeding summaries (${semester.academicYear.name} / ${semester.code}, ${semesterId})...`,
    );

    const result = await seedSummaries(prisma, semester.schoolId, semesterId);

    console.log('Done:', result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed summaries failed:', error);
  process.exit(1);
});
