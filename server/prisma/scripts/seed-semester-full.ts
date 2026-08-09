import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedAttendanceForSemester } from '../seed-data/attendance';
import { seedGradebook } from '../seed-data/gradebook';
import { seedTimetableEntriesForSemester } from '../seed-data/teaching-and-timetable';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  SEED_SEMESTER_ID: z.string().uuid().optional(),
  SEED_SEMESTER_CODE: z.string().optional(),
  SEED_ATTENDANCE_WEEKS: z.coerce.number().int().min(1).max(30).optional(),
});

async function resolveSemesterId(
  prisma: PrismaClient,
  env: z.infer<typeof envSchema>,
): Promise<string> {
  if (env.SEED_SEMESTER_ID) {
    return env.SEED_SEMESTER_ID;
  }

  const code = env.SEED_SEMESTER_CODE ?? 'HK2';
  const semester = await prisma.semester.findFirstOrThrow({
    where: { code },
    orderBy: { createdAt: 'desc' },
  });
  return semester.id;
}

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();

  try {
    const semesterId = await resolveSemesterId(prisma, env);
    const semester = await prisma.semester.findUniqueOrThrow({
      where: { id: semesterId },
      include: { academicYear: true },
    });

    console.log(
      `Seeding HK2 full data (${semester.academicYear.name} / ${semester.code}, ${semesterId})...`,
    );

    const timetable = await seedTimetableEntriesForSemester(
      prisma,
      semester.schoolId,
      semesterId,
      { replaceExisting: false },
    );
    console.log('Timetable:', timetable);

    const gradebook = await seedGradebook(
      prisma,
      semester.schoolId,
      semesterId,
    );
    console.log('Gradebook:', gradebook);

    const attendance = await seedAttendanceForSemester(
      prisma,
      semester.schoolId,
      semesterId,
      {
        weeks: env.SEED_ATTENDANCE_WEEKS ?? 12,
        replaceExisting: true,
      },
    );
    console.log('Attendance:', attendance);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed semester full failed:', error);
  process.exit(1);
});
