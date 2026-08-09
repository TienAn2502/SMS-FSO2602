import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedGradebook } from '../seed-data/gradebook';
import { seedSummaries } from '../seed-data/summaries';

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
    const semester = await prisma.semester.findFirstOrThrow({
      where: { schoolId: school.id, code: 'HK1' },
    });

    console.log(`Re-seeding gradebook + summaries (${school.code}, HK1)...`);

    const gradebook = await seedGradebook(prisma, school.id, semester.id);
    const summaries = await seedSummaries(prisma, school.id, semester.id);

    console.log('Gradebook:', gradebook);
    console.log('Summaries:', summaries);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Re-seed gradebook/summaries failed:', error);
  process.exit(1);
});
