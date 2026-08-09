import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { clearSemesterGradebookAndSummaries } from '../seed-data/clear-semester-gradebook-summaries';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const DEFAULT_HK2_SEMESTER_ID = '724c2b21-cb2b-45ce-93fe-a28393d7efe2';

const envSchema = z.object({
  CLEAR_GRADEBOOK_SEMESTER_ID: z.string().uuid().optional(),
  CLEAR_GRADEBOOK_SEMESTER_CODE: z.string().optional(),
});

async function resolveSemesterId(
  prisma: PrismaClient,
  env: z.infer<typeof envSchema>,
): Promise<string> {
  if (env.CLEAR_GRADEBOOK_SEMESTER_ID) {
    return env.CLEAR_GRADEBOOK_SEMESTER_ID;
  }

  const semester = await prisma.semester.findFirstOrThrow({
    where: { code: env.CLEAR_GRADEBOOK_SEMESTER_CODE ?? 'HK2' },
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

    console.log(
      `Clearing gradebook + HK summaries (${semester.academicYear.name} / ${semester.code}, ${semesterId})...`,
    );

    const result = await clearSemesterGradebookAndSummaries(prisma, semesterId);

    console.log('Done:', result);
    console.log(
      'Tip: assessments remain; scores empty. Re-seed with `pnpm prisma:seed-gradebook-semester` if needed.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Clear semester gradebook/summaries failed:', error);
  process.exit(1);
});
