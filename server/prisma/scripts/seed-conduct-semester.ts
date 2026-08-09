import { PrismaClient, SummaryStatus } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedConductForSemester } from '../seed-data/conduct';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  SEED_CONDUCT_SEMESTER_ID: z.string().uuid().optional(),
  SEED_CONDUCT_STATUS: z.enum(['DRAFT', 'CLOSED']).optional(),
  SEED_CONDUCT_REPLACE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();

  try {
    const semester = env.SEED_CONDUCT_SEMESTER_ID
      ? await prisma.semester.findUniqueOrThrow({
          where: { id: env.SEED_CONDUCT_SEMESTER_ID },
          include: { academicYear: true },
        })
      : await prisma.semester.findFirstOrThrow({
          where: { code: 'HK2', academicYear: { isCurrent: true } },
          include: { academicYear: true },
        });

    const status =
      env.SEED_CONDUCT_STATUS === 'CLOSED'
        ? SummaryStatus.CLOSED
        : SummaryStatus.DRAFT;

    console.log(
      `Seeding conduct (${semester.academicYear.name} / ${semester.code}, ${semester.id}, status=${status})...`,
    );

    const result = await seedConductForSemester(
      prisma,
      semester.schoolId,
      semester.id,
      {
        status,
        replaceExisting: env.SEED_CONDUCT_REPLACE ?? false,
      },
    );

    console.log('Done:', result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed conduct failed:', error);
  process.exit(1);
});
