import { AssessmentStatus, PrismaClient, SummaryStatus } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedGradebook } from '../seed-data/gradebook';
import { seedSummaries } from '../seed-data/summaries';
import { seedYearSummariesForAcademicYear } from '../seed-data/year-complete';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

/**
 * Seed đủ điểm HK2 cho mọi HS × mọi môn, ngoại trừ các lớp môn trong
 * SEED_EXCLUDE_COURSE_SECTION_CODES (mặc định: TOAN-10A1 — để trống tự điền).
 * Tổng kết HK DRAFT + khóa sổ + tổng kết năm DRAFT. Không chốt HK2.
 */
const envSchema = z.object({
  SEED_SCHOOL_CODE: z.string().min(1).default('DEMO'),
  SEED_YEAR_CODE: z.string().min(1).default('2025-26'),
  SEED_SEMESTER_CODE: z.string().min(1).default('HK2'),
  SEED_EXCLUDE_COURSE_SECTION_CODES: z.string().default('TOAN-10A1'),
  SEED_YEAR_SUMMARIES: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value !== 'false'),
});

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();
  const excludeCodes = env.SEED_EXCLUDE_COURSE_SECTION_CODES.split(',')
    .map((code) => code.trim())
    .filter(Boolean);

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

    const sectionCount = await prisma.courseSection.count({
      where: {
        schoolId: school.id,
        semesterId: semester.id,
        status: 'ACTIVE',
      },
    });

    if (sectionCount === 0) {
      throw new Error(
        `HK2 chưa có lớp môn — chạy «Chuẩn bị HK2 từ HK1» trước (hiện ${sectionCount}).`,
      );
    }

    console.log(
      `Seed HK scores (${academicYear.name} / ${semester.code}), exclude=[${excludeCodes.join(', ')}]`,
    );
    console.log(`  active course sections: ${sectionCount}`);

    console.log('1/4 Seed điểm...');
    const gradebook = await seedGradebook(prisma, school.id, semester.id, {
      replaceExisting: true,
      excludeCourseSectionCodes: excludeCodes,
    });
    console.log('  ', gradebook);

    for (const code of excludeCodes) {
      const section = await prisma.courseSection.findFirst({
        where: { schoolId: school.id, semesterId: semester.id, code },
        select: { code: true, _count: { select: { assessments: true } } },
      });
      console.log(
        `  exclude check ${code}: assessments=${section?._count.assessments ?? 'section missing'}`,
      );
    }

    console.log('2/4 Tái tính tổng kết + hạnh kiểm DRAFT...');
    const summaries = await seedSummaries(prisma, school.id, semester.id, {
      status: SummaryStatus.DRAFT,
      createYearSummaries: false,
    });
    console.log('  ', summaries);

    console.log('3/4 Khóa sổ điểm OPEN → CLOSED...');
    const locked = await prisma.assessment.updateMany({
      where: {
        schoolId: school.id,
        semesterId: semester.id,
        status: AssessmentStatus.OPEN,
      },
      data: { status: AssessmentStatus.CLOSED },
    });
    console.log('  ', { assessmentsLocked: locked.count });

    if (env.SEED_YEAR_SUMMARIES !== false) {
      console.log('4/4 Tổng kết năm (DRAFT)...');
      const yearSummaries = await seedYearSummariesForAcademicYear(
        prisma,
        school.id,
        academicYear.id,
      );
      console.log('  ', yearSummaries);
    } else {
      console.log('4/4 Bỏ qua tổng kết năm (SEED_YEAR_SUMMARIES=false).');
    }

    console.log(
      'Done — HK2 chưa chốt (summaries DRAFT). TOAN-10A1 trống để tự điền.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
