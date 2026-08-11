import { AssessmentStatus, PrismaClient, SummaryStatus } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedGradebook } from '../seed-data/gradebook';
import { seedSummaries } from '../seed-data/summaries';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

/**
 * Seed đủ điểm TX/GK/CK cho mọi HS × mọi môn của HK1,
 * tái tính tổng kết DRAFT, rồi khóa sổ (assessment CLOSED).
 * Không chốt học kỳ (semester summaries vẫn DRAFT).
 *
 * Env:
 * - SEED_SCHOOL_CODE (mặc định DEMO)
 * - SEED_YEAR_CODE (mặc định năm hiện hành)
 * - SEED_SEMESTER_CODE (mặc định HK1)
 */
const envSchema = z.object({
  SEED_SCHOOL_CODE: z.string().min(1).default('DEMO'),
  SEED_YEAR_CODE: z.string().min(1).optional(),
  SEED_SEMESTER_CODE: z.string().min(1).default('HK1'),
});

async function lockSemesterAssessments(
  prisma: PrismaClient,
  schoolId: string,
  semesterId: string,
): Promise<number> {
  const result = await prisma.assessment.updateMany({
    where: {
      schoolId,
      semesterId,
      status: AssessmentStatus.OPEN,
    },
    data: { status: AssessmentStatus.CLOSED },
  });
  return result.count;
}

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();

  try {
    const school = await prisma.school.findUniqueOrThrow({
      where: { code: env.SEED_SCHOOL_CODE },
    });

    const academicYear = env.SEED_YEAR_CODE
      ? await prisma.academicYear.findFirstOrThrow({
          where: { schoolId: school.id, code: env.SEED_YEAR_CODE },
        })
      : ((await prisma.academicYear.findFirst({
          where: { schoolId: school.id, isCurrent: true },
        })) ??
        (await prisma.academicYear.findFirstOrThrow({
          where: { schoolId: school.id },
          orderBy: { startDate: 'desc' },
        })));

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
    const teachingCount = await prisma.teachingAssignment.count({
      where: {
        schoolId: school.id,
        status: 'ACTIVE',
        courseSection: { semesterId: semester.id },
      },
    });

    if (courseSectionCount === 0) {
      throw new Error(
        `Không có lớp môn ACTIVE cho ${academicYear.code}/${semester.code}`,
      );
    }
    if (teachingCount === 0) {
      throw new Error(
        'Chưa có phân công giảng dạy — chạy pnpm prisma:seed-teaching-timetable trước',
      );
    }

    console.log(
      `HK scores + lock gradebook (${academicYear.name} / ${semester.code})`,
    );
    console.log(
      `  school=${school.code}, courseSections=${courseSectionCount}, teaching=${teachingCount}`,
    );

    console.log('1/3 Seed điểm (mọi HS × mọi môn, đủ TX/GK/CK)...');
    const gradebook = await seedGradebook(prisma, school.id, semester.id);
    console.log('  ', gradebook);

    console.log('2/3 Tái tính tổng kết + hạnh kiểm (DRAFT, chưa chốt HK)...');
    const summaries = await seedSummaries(prisma, school.id, semester.id, {
      status: SummaryStatus.DRAFT,
      createYearSummaries: false,
    });
    console.log('  ', summaries);

    console.log('3/3 Khóa sổ điểm (assessment OPEN → CLOSED)...');
    const assessmentsLocked = await lockSemesterAssessments(
      prisma,
      school.id,
      semester.id,
    );
    console.log('  ', { assessmentsLocked });

    const [openRemaining, summariesClosed] = await Promise.all([
      prisma.assessment.count({
        where: {
          schoolId: school.id,
          semesterId: semester.id,
          status: AssessmentStatus.OPEN,
        },
      }),
      prisma.studentSemesterSummary.count({
        where: {
          schoolId: school.id,
          semesterId: semester.id,
          status: SummaryStatus.CLOSED,
        },
      }),
    ]);

    console.log('Done.');
    console.log(
      JSON.stringify(
        {
          openAssessmentsRemaining: openRemaining,
          semesterSummariesClosed: summariesClosed,
          note: 'Sổ điểm đã khóa; học kỳ chưa chốt (summaries DRAFT).',
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
