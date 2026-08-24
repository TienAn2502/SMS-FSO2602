import { AssessmentStatus, PrismaClient, SummaryStatus } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedGradebook } from '../seed-data/gradebook';
import { seedSummaries } from '../seed-data/summaries';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const COURSE_SECTION_CODE = 'TOAN-10A1';

const envSchema = z.object({
  SEED_SCHOOL_CODE: z.string().min(1).default('DEMO'),
  SEED_YEAR_CODE: z.string().min(1).default('2025-26'),
  SEED_SEMESTER_CODE: z.string().min(1).default('HK1'),
  SEED_COURSE_SECTION_CODE: z.string().min(1).default(COURSE_SECTION_CODE),
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

    const sectionCode = env.SEED_COURSE_SECTION_CODE.trim().toUpperCase();

    console.log(
      `Seed sổ điểm ${sectionCode} (${academicYear.name} / ${semester.code})...`,
    );

    const gradebook = await seedGradebook(prisma, school.id, semester.id, {
      includeCourseSectionCodes: [sectionCode],
      replaceExisting: false,
    });
    console.log('  ', gradebook);

    const section = await prisma.courseSection.findFirstOrThrow({
      where: {
        schoolId: school.id,
        semesterId: semester.id,
        code: sectionCode,
      },
      select: {
        code: true,
        _count: { select: { assessments: true } },
      },
    });
    console.log(
      `  verify ${section.code}: ${section._count.assessments} assessments`,
    );

    console.log('Tái tính tổng kết HK (DRAFT)...');
    const summaries = await seedSummaries(prisma, school.id, semester.id, {
      status: SummaryStatus.DRAFT,
      createYearSummaries: false,
    });
    console.log('  ', summaries);

    console.log('Khóa sổ điểm (mọi lớp môn OPEN → CLOSED)...');
    const locked = await prisma.assessment.updateMany({
      where: {
        schoolId: school.id,
        semesterId: semester.id,
        status: AssessmentStatus.OPEN,
      },
      data: { status: AssessmentStatus.CLOSED },
    });
    console.log('  ', { assessmentsLocked: locked.count });

    const openRemaining = await prisma.assessment.count({
      where: {
        schoolId: school.id,
        semesterId: semester.id,
        status: AssessmentStatus.OPEN,
      },
    });
    console.log(`Done — OPEN còn lại: ${openRemaining}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
