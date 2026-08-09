import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedAttendanceForSemester } from '../seed-data/attendance';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  SEED_ATTENDANCE_SEMESTER_ID: z.string().uuid().optional(),
  SEED_ATTENDANCE_SEMESTER_CODE: z.string().optional(),
  SEED_ATTENDANCE_WEEKS: z.coerce.number().int().min(1).max(30).optional(),
  SEED_ATTENDANCE_REPLACE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();

  try {
    let semesterId = env.SEED_ATTENDANCE_SEMESTER_ID;

    if (!semesterId) {
      const code = env.SEED_ATTENDANCE_SEMESTER_CODE ?? 'HK2';
      const semester = await prisma.semester.findFirstOrThrow({
        where: { code },
        orderBy: { createdAt: 'desc' },
        include: { academicYear: true },
      });
      semesterId = semester.id;
      console.log(
        `Resolved semester ${code} (${semester.academicYear.name}, ${semesterId})`,
      );
    }

    const semester = await prisma.semester.findUniqueOrThrow({
      where: { id: semesterId },
      include: { academicYear: true },
    });

    const weeks = env.SEED_ATTENDANCE_WEEKS ?? 12;

    console.log(
      `Seeding attendance (${semester.academicYear.name} / ${semester.code}, ${weeks} weeks)...`,
    );

    const result = await seedAttendanceForSemester(
      prisma,
      semester.schoolId,
      semesterId,
      {
        weeks,
        replaceExisting: env.SEED_ATTENDANCE_REPLACE ?? true,
      },
    );

    console.log('Done:', result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed attendance failed:', error);
  process.exit(1);
});
