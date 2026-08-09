import { AssessmentStatus, PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  LOCK_SEMESTER_ID: z.string().uuid().optional(),
  LOCK_SEMESTER_CODE: z.string().optional(),
});

async function resolveSemesterId(
  prisma: PrismaClient,
  env: z.infer<typeof envSchema>,
): Promise<string> {
  if (env.LOCK_SEMESTER_ID) {
    return env.LOCK_SEMESTER_ID;
  }

  const semester = await prisma.semester.findFirstOrThrow({
    where: { code: env.LOCK_SEMESTER_CODE ?? 'HK2' },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
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

    const courseSectionCount = await prisma.courseSection.count({
      where: { schoolId: semester.schoolId, semesterId, status: 'ACTIVE' },
    });

    if (courseSectionCount === 0) {
      throw new Error(`No active course sections for semester ${semesterId}`);
    }

    process.stdout.write(
      `Locking gradebooks (${semester.academicYear.name} / ${semester.code}, ${courseSectionCount} lớp môn)...\n`,
    );

    const lockResult = await prisma.assessment.updateMany({
      where: {
        schoolId: semester.schoolId,
        semesterId,
        status: AssessmentStatus.OPEN,
      },
      data: { status: AssessmentStatus.CLOSED },
    });

    const [openRemaining, closedCount, assessmentCount] = await Promise.all([
      prisma.assessment.count({
        where: {
          schoolId: semester.schoolId,
          semesterId,
          status: AssessmentStatus.OPEN,
        },
      }),
      prisma.assessment.count({
        where: {
          schoolId: semester.schoolId,
          semesterId,
          status: AssessmentStatus.CLOSED,
        },
      }),
      prisma.assessment.count({
        where: { schoolId: semester.schoolId, semesterId },
      }),
    ]);

    process.stdout.write(
      `${JSON.stringify(
        {
          semesterId,
          courseSectionCount,
          assessmentsLocked: lockResult.count,
          assessmentCount,
          closedCount,
          openAssessmentsRemaining: openRemaining,
        },
        null,
        2,
      )}\n`,
    );

    process.stdout.write(
      'Tip: run `pnpm prisma:seed-summaries-semester` or admin "Tái tính" to rebuild summaries.\n',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Lock semester gradebook failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
