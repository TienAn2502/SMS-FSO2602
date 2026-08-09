import type { PrismaClient } from '@prisma/client';

import { getThptBgdTotalPeriodsPerYear, getThptBgdEvaluationMode } from './thpt-curriculum';

/** Cập nhật `periods_per_year` và `evaluation_mode` cho mọi grade_level_subjects của trường. */
export async function backfillGradeLevelSubjectPeriods(
  prisma: PrismaClient,
  schoolId: string,
): Promise<number> {
  const rows = await prisma.gradeLevelSubject.findMany({
    where: { schoolId },
    select: {
      id: true,
      subject: { select: { code: true } },
    },
  });

  let updated = 0;
  for (const row of rows) {
    const periodsPerYear = getThptBgdTotalPeriodsPerYear(row.subject.code);
    const evaluationMode = getThptBgdEvaluationMode(row.subject.code);

    await prisma.gradeLevelSubject.update({
      where: { id: row.id },
      data: {
        ...(periodsPerYear != null ? { periodsPerYear } : {}),
        evaluationMode,
      },
    });
    updated += 1;
  }

  return updated;
}
