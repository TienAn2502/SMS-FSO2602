import {
  EnrollmentStatus,
  Prisma,
  PrismaClient,
  SummaryStatus,
} from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';

import { seedHomeroomClassSummaries } from '../seed-data/summaries';
import { seedYearSummariesForAcademicYear } from '../seed-data/year-complete';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

/**
 * HS chuyển lớp giữa kỳ (HK1 ở 10A1, HK2 ACTIVE ở 10A2) làm readiness lệch:
 * - HK1 summary/conduct còn gắn 10A1
 * - HK2 subject results CLOSED nhưng chưa có điểm → overallAverage null → PENDING
 *
 * Script: gán lại HK1 về 10A2, bổ sung điểm HK2 thiếu, tái tính tổng kết lớp + năm.
 */
async function fillMissingHk2ScoresForClass(
  prisma: PrismaClient,
  schoolId: string,
  semesterId: string,
  homeroomClassId: string,
  studentIds: string[],
): Promise<number> {
  if (studentIds.length === 0) {
    return 0;
  }

  const assessments = await prisma.assessment.findMany({
    where: {
      schoolId,
      semesterId,
      courseSection: { homeroomClassId },
    },
    select: {
      id: true,
      type: true,
      courseSection: {
        select: {
          code: true,
          gradeLevelSubject: {
            select: { subject: { select: { code: true } } },
          },
        },
      },
      scores: {
        where: { studentId: { in: studentIds } },
        select: { studentId: true },
      },
    },
  });

  const rows: Array<{
    schoolId: string;
    assessmentId: string;
    studentId: string;
    score: Prisma.Decimal;
    note: null;
  }> = [];

  for (const assessment of assessments) {
    const have = new Set(assessment.scores.map((s) => s.studentId));
    const subjectCode =
      assessment.courseSection.gradeLevelSubject.subject.code;
    let slot = 0;
    for (const studentId of studentIds) {
      if (have.has(studentId)) {
        continue;
      }
      // Đủ ngưỡng Đạt (≥5) cho cả môn NX và môn tính điểm
      const base =
        6.5 +
        (studentId.charCodeAt(0) % 5) * 0.2 +
        (subjectCode.charCodeAt(0) % 3) * 0.15 +
        slot * 0.1;
      const clamped = Math.max(5.5, Math.min(9.5, Math.round(base * 2) / 2));
      rows.push({
        schoolId,
        assessmentId: assessment.id,
        studentId,
        score: new Prisma.Decimal(clamped),
        note: null,
      });
      slot += 1;
    }
  }

  if (rows.length === 0) {
    return 0;
  }

  const created = await prisma.score.createMany({
    data: rows,
    skipDuplicates: true,
  });
  return created.count;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const year = await prisma.academicYear.findFirstOrThrow({
      where: { code: '25-26', school: { code: 'DEMO' } },
      include: {
        semesters: true,
        school: { select: { id: true, code: true } },
      },
    });
    const hk1 = year.semesters.find((s) => s.code === 'HK1');
    const hk2 = year.semesters.find((s) => s.code === 'HK2');
    if (!hk1 || !hk2) {
      throw new Error('Missing HK1/HK2');
    }

    const a2 = await prisma.homeroomClass.findFirstOrThrow({
      where: {
        schoolId: year.schoolId,
        academicYearId: year.id,
        code: '10A2',
      },
      select: {
        id: true,
        code: true,
        homeroomTeacherId: true,
        academicYearId: true,
      },
    });

    const transferred = await prisma.studentEnrollment.findMany({
      where: {
        schoolId: year.schoolId,
        semesterId: hk2.id,
        homeroomClassId: a2.id,
        status: EnrollmentStatus.ACTIVE,
      },
      include: { student: { select: { id: true, fullName: true } } },
    });

    const toFix: Array<{ studentId: string; fullName: string }> = [];

    for (const row of transferred) {
      const hk1Enroll = await prisma.studentEnrollment.findFirst({
        where: {
          schoolId: year.schoolId,
          semesterId: hk1.id,
          studentId: row.studentId,
          status: {
            in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.SEMESTER_COMPLETED],
          },
        },
      });

      if (hk1Enroll && hk1Enroll.homeroomClassId !== a2.id) {
        toFix.push({
          studentId: row.studentId,
          fullName: row.student.fullName,
        });
      }
    }

    console.log(
      `Found ${toFix.length} HK2/10A2 student(s) with HK1 on another class:`,
      toFix.map((s) => s.fullName),
    );

    for (const student of toFix) {
      console.log(`Aligning ${student.fullName} → 10A2...`);

      await prisma.$transaction([
        prisma.studentEnrollment.updateMany({
          where: {
            schoolId: year.schoolId,
            semesterId: hk1.id,
            studentId: student.studentId,
            status: {
              in: [
                EnrollmentStatus.ACTIVE,
                EnrollmentStatus.SEMESTER_COMPLETED,
              ],
            },
          },
          data: { homeroomClassId: a2.id },
        }),
        prisma.studentConductRecord.updateMany({
          where: {
            schoolId: year.schoolId,
            semesterId: hk1.id,
            studentId: student.studentId,
          },
          data: {
            homeroomClassId: a2.id,
            status: SummaryStatus.CLOSED,
          },
        }),
        prisma.studentSemesterSummary.updateMany({
          where: {
            schoolId: year.schoolId,
            semesterId: hk1.id,
            studentId: student.studentId,
          },
          data: {
            homeroomClassId: a2.id,
            status: SummaryStatus.CLOSED,
          },
        }),
        prisma.studentYearSummary.updateMany({
          where: {
            schoolId: year.schoolId,
            academicYearId: year.id,
            studentId: student.studentId,
          },
          data: { homeroomClassId: a2.id },
        }),
      ]);
    }

    // HS ACTIVE 10A2 thiếu điểm HK2 (subject result CLOSED, average null)
    const incomplete = await prisma.studentSemesterSummary.findMany({
      where: {
        schoolId: year.schoolId,
        semesterId: hk2.id,
        homeroomClassId: a2.id,
        OR: [
          { overallAverage: null },
          { status: SummaryStatus.DRAFT },
        ],
      },
      select: {
        studentId: true,
        student: { select: { fullName: true } },
      },
    });

    const scoreStudentIds = [
      ...new Set([
        ...toFix.map((s) => s.studentId),
        ...incomplete.map((s) => s.studentId),
      ]),
    ];

    console.log(
      `Filling missing HK2 scores for ${scoreStudentIds.length} student(s):`,
      incomplete.map((s) => s.student.fullName),
    );

    const scoresCreated = await fillMissingHk2ScoresForClass(
      prisma,
      year.schoolId,
      hk2.id,
      a2.id,
      scoreStudentIds,
    );
    console.log(`  scores created: ${scoresCreated}`);

    console.log('Recomputing 10A2 HK2 summaries (CLOSED)...');
    const classResult = await seedHomeroomClassSummaries(prisma, {
      schoolId: year.schoolId,
      semesterId: hk2.id,
      homeroomClass: a2,
      status: SummaryStatus.CLOSED,
      createYearSummaries: false,
    });
    console.log(' ', classResult);

    console.log('Recomputing year summaries...');
    const yearResult = await seedYearSummariesForAcademicYear(
      prisma,
      year.schoolId,
      year.id,
    );
    console.log(yearResult);

    const [hk2Active, hk1ClosedSum, hk1ClosedConduct, pending] =
      await Promise.all([
        prisma.studentEnrollment.count({
          where: {
            schoolId: year.schoolId,
            semesterId: hk2.id,
            homeroomClassId: a2.id,
            status: EnrollmentStatus.ACTIVE,
          },
        }),
        prisma.studentSemesterSummary.count({
          where: {
            schoolId: year.schoolId,
            semesterId: hk1.id,
            homeroomClassId: a2.id,
            status: SummaryStatus.CLOSED,
          },
        }),
        prisma.studentConductRecord.count({
          where: {
            schoolId: year.schoolId,
            semesterId: hk1.id,
            homeroomClassId: a2.id,
            status: SummaryStatus.CLOSED,
          },
        }),
        prisma.studentYearSummary.count({
          where: {
            schoolId: year.schoolId,
            academicYearId: year.id,
            homeroomClassId: a2.id,
            promotionDecision: 'PENDING',
          },
        }),
      ]);

    console.log('10A2 verify:', {
      hk2Active,
      hk1ClosedSum,
      hk1ClosedConduct,
      pending,
      ready:
        hk2Active <= hk1ClosedSum &&
        hk2Active <= hk1ClosedConduct &&
        pending === 0,
    });
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
