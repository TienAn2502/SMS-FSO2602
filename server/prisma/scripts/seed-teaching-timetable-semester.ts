import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedTeachingAssignmentsAndTimetable } from '../seed-data/teaching-and-timetable';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

/**
 * Seed phân công giảng dạy + TKB cho một học kỳ.
 *
 * Mặc định: năm 2025-2026 (code 2025-26), HK1, replace = true.
 *
 * Env:
 * - SEED_SCHOOL_CODE (mặc định DEMO)
 * - SEED_YEAR_CODE (mặc định 2025-26)
 * - SEED_SEMESTER_CODE (mặc định HK1)
 * - SEED_TEACHING_TIMETABLE_REPLACE (mặc định true)
 */
const envSchema = z.object({
  SEED_SCHOOL_CODE: z.string().min(1).default('DEMO'),
  SEED_YEAR_CODE: z.string().min(1).default('2025-26'),
  SEED_SEMESTER_CODE: z.string().min(1).default('HK1'),
  SEED_TEACHING_TIMETABLE_REPLACE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
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

    const courseSectionCount = await prisma.courseSection.count({
      where: {
        schoolId: school.id,
        semesterId: semester.id,
        status: 'ACTIVE',
      },
    });

    console.log(
      `Seeding teaching assignments + TKB (${academicYear.name} / ${semester.code})...`,
    );
    console.log(
      `  school=${school.code}, semesterId=${semester.id}, courseSections=${courseSectionCount}, replace=${env.SEED_TEACHING_TIMETABLE_REPLACE}`,
    );

    const result = await seedTeachingAssignmentsAndTimetable(
      prisma,
      school.id,
      semester.id,
      semester.startDate,
      { replaceExisting: env.SEED_TEACHING_TIMETABLE_REPLACE },
    );

    if (result.assignmentCount === 0 && result.timetableCount === 0) {
      console.log(
        'Skipped: đã có phân công/TKB (đặt SEED_TEACHING_TIMETABLE_REPLACE=true để ghi đè).',
      );
    } else {
      console.log('Done:', result);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed teaching + timetable failed:', error);
  process.exit(1);
});
