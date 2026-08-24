import { PassFailResult, Prisma, type PrismaClient } from '@prisma/client';

import { computeSubjectYearAverage } from '@/common/utils/gradebook-average.util';

export type SubjectYearAverageRow = {
  studentId: string;
  courseSectionCode: string;
  semesterCode: string;
  semesterAverage: number | null;
  yearAverage: number | null;
};

export type SubjectPassFailRow = {
  studentId: string;
  courseSectionCode: string;
  semesterCode: string;
  passFailResult: PassFailResult | null;
};

export type SubjectYearAveragePlanRow = {
  id: string;
  studentId: string;
  courseSectionCode: string;
  semesterCode: string;
  semesterAverage: number | null;
  yearAverage: number | null;
};

export type SubjectYearAverageUpdate = {
  id: string;
  yearAverage: number;
};

const YEAR_AVERAGE_UPDATE_CHUNK = 500;

/** Một TB/năm cho mỗi môn (course section code), ưu tiên yearAverage đã lưu rồi tính từ HK1+HK2. */
export function buildYearSubjectAveragesByStudentId(
  rows: SubjectYearAverageRow[],
): Map<string, number[]> {
  const byStudentSubject = new Map<string, SubjectYearAverageRow[]>();

  for (const row of rows) {
    const key = `${row.studentId}::${row.courseSectionCode}`;
    const list = byStudentSubject.get(key) ?? [];
    list.push(row);
    byStudentSubject.set(key, list);
  }

  const result = new Map<string, number[]>();

  for (const [, group] of byStudentSubject) {
    const studentId = group[0]?.studentId;
    if (!studentId) {
      continue;
    }

    const hk1 = group.find((row) => row.semesterCode === 'HK1');
    const hk2 = group.find((row) => row.semesterCode === 'HK2');
    const stored =
      hk2?.yearAverage ??
      hk1?.yearAverage ??
      group.find((row) => row.yearAverage != null)?.yearAverage ??
      null;

    const computed = computeSubjectYearAverage(
      hk1?.semesterAverage ?? null,
      hk2?.semesterAverage ?? null,
    );

    const yearAverage = stored ?? computed;
    if (yearAverage == null) {
      continue;
    }

    const list = result.get(studentId) ?? [];
    list.push(yearAverage);
    result.set(studentId, list);
  }

  return result;
}

/** Một kết quả NX/năm cho mỗi môn — FAIL nếu bất kỳ HK nào FAIL. */
export function buildPassFailResultsByStudentId(
  rows: SubjectPassFailRow[],
): Map<string, PassFailResult[]> {
  const byStudentSubject = new Map<string, SubjectPassFailRow[]>();

  for (const row of rows) {
    if (row.passFailResult == null) {
      continue;
    }
    const key = `${row.studentId}::${row.courseSectionCode}`;
    const list = byStudentSubject.get(key) ?? [];
    list.push(row);
    byStudentSubject.set(key, list);
  }

  const result = new Map<string, PassFailResult[]>();

  for (const [, group] of byStudentSubject) {
    const studentId = group[0]?.studentId;
    if (!studentId) {
      continue;
    }

    const hasFail = group.some(
      (row) => row.passFailResult === PassFailResult.FAIL,
    );
    const value = hasFail ? PassFailResult.FAIL : PassFailResult.PASS;

    const list = result.get(studentId) ?? [];
    list.push(value);
    result.set(studentId, list);
  }

  return result;
}

/** Tính danh sách id cần ghi yearAverage (pure — dễ test). */
export function planSubjectYearAverageUpdates(
  rows: SubjectYearAveragePlanRow[],
): { updates: SubjectYearAverageUpdate[]; updatedGroupCount: number } {
  const groups = new Map<string, SubjectYearAveragePlanRow[]>();

  for (const row of rows) {
    const key = `${row.studentId}::${row.courseSectionCode}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const updates: SubjectYearAverageUpdate[] = [];
  let updatedGroupCount = 0;

  for (const group of groups.values()) {
    const hk1 = group.find((row) => row.semesterCode === 'HK1');
    const hk2 = group.find((row) => row.semesterCode === 'HK2');
    const yearAverage = computeSubjectYearAverage(
      hk1?.semesterAverage ?? null,
      hk2?.semesterAverage ?? null,
    );

    if (yearAverage == null) {
      continue;
    }

    let groupNeedsUpdate = false;

    for (const row of group) {
      const current = row.yearAverage;
      if (current == null || Math.abs(current - yearAverage) >= 1e-6) {
        updates.push({ id: row.id, yearAverage });
        groupNeedsUpdate = true;
      }
    }

    if (groupNeedsUpdate) {
      updatedGroupCount += 1;
    }
  }

  return { updates, updatedGroupCount };
}

async function applySubjectYearAverageUpdates(
  prisma: Pick<PrismaClient, '$executeRaw'>,
  updates: SubjectYearAverageUpdate[],
): Promise<void> {
  if (updates.length === 0) {
    return;
  }

  for (let index = 0; index < updates.length; index += YEAR_AVERAGE_UPDATE_CHUNK) {
    const chunk = updates.slice(index, index + YEAR_AVERAGE_UPDATE_CHUNK);
    const values = chunk.map(
      (row) => Prisma.sql`(${row.id}::uuid, ${row.yearAverage}::numeric)`,
    );

    await prisma.$executeRaw`
      UPDATE student_subject_results AS ssr
      SET year_average = v.year_average
      FROM (VALUES ${Prisma.join(values)}) AS v(id, year_average)
      WHERE ssr.id = v.id
    `;
  }
}

export async function backfillSubjectYearAverages(
  prisma: Pick<PrismaClient, 'studentSubjectResult' | '$executeRaw'>,
  schoolId: string,
  academicYearId: string,
): Promise<number> {
  const rows = await prisma.studentSubjectResult.findMany({
    where: {
      schoolId,
      evaluationMode: 'NUMERIC',
      semester: { academicYearId },
    },
    select: {
      id: true,
      studentId: true,
      semesterAverage: true,
      yearAverage: true,
      semester: { select: { code: true } },
      courseSection: { select: { code: true } },
    },
  });

  const { updates, updatedGroupCount } = planSubjectYearAverageUpdates(
    rows.map((row) => ({
      id: row.id,
      studentId: row.studentId,
      courseSectionCode: row.courseSection.code,
      semesterCode: row.semester.code,
      semesterAverage: row.semesterAverage?.toNumber() ?? null,
      yearAverage: row.yearAverage?.toNumber() ?? null,
    })),
  );

  await applySubjectYearAverageUpdates(prisma, updates);

  return updatedGroupCount;
}
