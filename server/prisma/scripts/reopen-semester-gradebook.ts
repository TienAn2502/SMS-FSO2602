import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const DEFAULT_HK2_SEMESTER_ID = '724c2b21-cb2b-45ce-93fe-a28393d7efe2';

const envSchema = z.object({
  REOPEN_SEMESTER_ID: z.string().uuid().optional(),
});

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const semesterId = env.REOPEN_SEMESTER_ID ?? DEFAULT_HK2_SEMESTER_ID;
  const prisma = new PrismaClient();

  try {
    const semester = await prisma.semester.findUniqueOrThrow({
      where: { id: semesterId },
      include: { academicYear: true },
    });

    console.log(
      `Reopening gradebook + summaries (${semester.academicYear.name} / ${semester.code})...`,
    );

    const [
      assessmentsOpened,
      subjectResultsDraft,
      semesterSummariesDraft,
      conductRecordsDraft,
    ] = await prisma.$transaction([
      prisma.assessment.updateMany({
        where: { schoolId: semester.schoolId, semesterId, status: 'CLOSED' },
        data: { status: 'OPEN' },
      }),
      prisma.studentSubjectResult.updateMany({
        where: { schoolId: semester.schoolId, semesterId, status: 'CLOSED' },
        data: { status: 'DRAFT' },
      }),
      prisma.studentSemesterSummary.updateMany({
        where: { schoolId: semester.schoolId, semesterId, status: 'CLOSED' },
        data: { status: 'DRAFT', finalizedAt: null },
      }),
      prisma.studentConductRecord.updateMany({
        where: { schoolId: semester.schoolId, semesterId, status: 'CLOSED' },
        data: { status: 'DRAFT' },
      }),
    ]);

    console.log('Done:', {
      assessmentsOpened: assessmentsOpened.count,
      subjectResultsDraft: subjectResultsDraft.count,
      semesterSummariesDraft: semesterSummariesDraft.count,
      conductRecordsDraft: conductRecordsDraft.count,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Reopen semester failed:', error);
  process.exit(1);
});
