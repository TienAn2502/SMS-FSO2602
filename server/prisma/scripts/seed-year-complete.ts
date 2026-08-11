import { PrismaClient, SummaryStatus } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedAttendanceForSemester } from '../seed-data/attendance';
import { seedGradebook } from '../seed-data/gradebook';
import { prepareNextSemesterFromSource } from '../seed-data/prepare-next-semester';
import { seedSummaries } from '../seed-data/summaries';
import { seedTimetableEntriesForSemester } from '../seed-data/teaching-and-timetable';
import {
  finalizeSemesterSummaries,
  lockSemesterAssessments,
  seedYearSummariesForAcademicYear,
  setCurrentSemester,
} from '../seed-data/year-complete';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  SEED_YEAR_ID: z.string().uuid().optional(),
  SEED_ATTENDANCE_WEEKS: z.coerce.number().int().min(1).max(30).optional(),
  SEED_SKIP_HK1: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

async function resolveCurrentYear(prisma: PrismaClient, yearId?: string) {
  if (yearId) {
    return prisma.academicYear.findFirstOrThrow({
      where: { id: yearId },
      include: {
        semesters: { orderBy: { startDate: 'asc' } },
        school: { select: { id: true, name: true, code: true } },
      },
    });
  }

  return prisma.academicYear.findFirstOrThrow({
    where: { isCurrent: true },
    include: {
      semesters: { orderBy: { startDate: 'asc' } },
      school: { select: { id: true, name: true, code: true } },
    },
  });
}

async function completeSemester(
  prisma: PrismaClient,
  schoolId: string,
  semester: { id: string; code: string; name: string },
  attendanceWeeks: number,
): Promise<void> {
  console.log(`\n=== ${semester.code} (${semester.name}) ===`);

  console.log('Gradebook (điểm TX/GK/CK)...');
  const gradebook = await seedGradebook(prisma, schoolId, semester.id);
  console.log('  ', gradebook);

  console.log('Attendance (điểm danh)...');
  const attendance = await seedAttendanceForSemester(
    prisma,
    schoolId,
    semester.id,
    { weeks: attendanceWeeks, replaceExisting: true },
  );
  console.log('  ', attendance);

  console.log('Lock assessments + seed summaries CLOSED...');
  const locked = await lockSemesterAssessments(prisma, schoolId, semester.id);
  const summaries = await seedSummaries(prisma, schoolId, semester.id, {
    status: SummaryStatus.CLOSED,
    createYearSummaries: false,
  });
  console.log('  ', { assessmentsLocked: locked, summaries });
}

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();

  try {
    const year = await resolveCurrentYear(prisma, env.SEED_YEAR_ID);
    const schoolId = year.schoolId;
    const hk1 = year.semesters.find((row) => row.code === 'HK1');
    const hk2 = year.semesters.find((row) => row.code === 'HK2');

    if (!hk1 || !hk2) {
      throw new Error(
        `Year ${year.name} must have both HK1 and HK2 (found: ${year.semesters
          .map((s) => s.code)
          .join(', ')})`,
      );
    }

    const attendanceWeeks = env.SEED_ATTENDANCE_WEEKS ?? 12;

    console.log(
      `Completing academic year ${year.name} for ${year.school.name} (${year.school.code})...`,
    );

    if (!env.SEED_SKIP_HK1) {
      await completeSemester(prisma, schoolId, hk1, attendanceWeeks);
    } else {
      console.log(
        '\n=== HK1 skipped (SEED_SKIP_HK1=true) — ensure locked + CLOSED ===',
      );
      const closed = await finalizeSemesterSummaries(prisma, schoolId, hk1.id);
      console.log('  ', closed);

      const summaryCount = await prisma.studentSemesterSummary.count({
        where: { schoolId, semesterId: hk1.id },
      });
      if (summaryCount === 0) {
        console.log('  No HK1 summaries — seeding CLOSED...');
        await seedGradebook(prisma, schoolId, hk1.id);
        await seedSummaries(prisma, schoolId, hk1.id, {
          status: SummaryStatus.CLOSED,
          createYearSummaries: false,
        });
      }
    }

    console.log('\n=== Prepare HK2 from HK1 (lớp môn / ghi danh / GV) ===');
    const prepared = await prepareNextSemesterFromSource(
      prisma,
      schoolId,
      hk1.id,
      hk2.id,
    );
    console.log('  ', prepared);

    console.log('Timetable HK2...');
    const timetable = await seedTimetableEntriesForSemester(
      prisma,
      schoolId,
      hk2.id,
      { replaceExisting: false },
    );
    console.log('  ', timetable);

    await completeSemester(prisma, schoolId, hk2, attendanceWeeks);

    console.log('\n=== Year summaries (xét lên lớp DRAFT) ===');
    // Clear draft year placeholders then recompute
    await prisma.studentYearSummary.deleteMany({
      where: {
        schoolId,
        academicYearId: year.id,
        status: SummaryStatus.DRAFT,
      },
    });
    const yearSummaries = await seedYearSummariesForAcademicYear(
      prisma,
      schoolId,
      year.id,
    );
    console.log('  ', yearSummaries);

    console.log('\n=== Set HK2 as current semester (UI chốt lên lớp) ===');
    await setCurrentSemester(prisma, schoolId, hk2.id);
    console.log('  HK2 is_current = true');

    console.log('\nDone. Next on UI:');
    console.log('  Tổng kết → Cả năm / Lên lớp → Chốt lên lớp');
    console.log(
      '  (optional) tạo năm mới + lớp HC → Tạo ghi danh năm sau',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed year complete failed:', error);
  process.exit(1);
});
