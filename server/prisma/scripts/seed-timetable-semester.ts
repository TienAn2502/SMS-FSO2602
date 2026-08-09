import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedTimetableEntriesForSemester } from '../seed-data/teaching-and-timetable';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const DEFAULT_HK2_SEMESTER_ID = '724c2b21-cb2b-45ce-93fe-a28393d7efe2';

const envSchema = z.object({
  SEED_TIMETABLE_SEMESTER_ID: z.string().uuid().optional(),
  SEED_TIMETABLE_SEMESTER_CODE: z.string().optional(),
  SEED_TIMETABLE_REPLACE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();

  try {
    let semesterId = env.SEED_TIMETABLE_SEMESTER_ID ?? DEFAULT_HK2_SEMESTER_ID;

    if (env.SEED_TIMETABLE_SEMESTER_CODE) {
      const semester = await prisma.semester.findFirstOrThrow({
        where: { code: env.SEED_TIMETABLE_SEMESTER_CODE },
        orderBy: { createdAt: 'desc' },
      });
      semesterId = semester.id;
    } else if (!env.SEED_TIMETABLE_SEMESTER_ID) {
      const semester = await prisma.semester.findFirst({
        where: { code: 'HK2' },
        orderBy: { createdAt: 'desc' },
      });
      if (semester) {
        semesterId = semester.id;
      }
    }

    const semester = await prisma.semester.findUniqueOrThrow({
      where: { id: semesterId },
      include: { academicYear: true },
    });

    console.log(
      `Seeding timetable (${semester.academicYear.name} / ${semester.code}, ${semesterId})...`,
    );

    const result = await seedTimetableEntriesForSemester(
      prisma,
      semester.schoolId,
      semesterId,
      { replaceExisting: env.SEED_TIMETABLE_REPLACE ?? false },
    );

    console.log('Done:', result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed timetable failed:', error);
  process.exit(1);
});
