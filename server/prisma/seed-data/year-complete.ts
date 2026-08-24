import {
  AssessmentStatus,
  AttendanceRecordStatus,
  Prisma,
  PrismaClient,
  PromotionDecision,
  SummaryStatus,
} from '@prisma/client';

import {
  computeYearOverallAverage,
  resolvePromotionDecision,
  resolveYearAcademicResultLevel,
  resolveYearTrainingResultLevel,
} from '../../src/common/utils/promotion.util';
import { isGraduatingGradeLevel } from '../../src/common/utils/grade-level.util';
import { STUDENT_YEAR_ENROLLMENT_STATUSES } from '../../src/common/utils/enrollment-status.util';
import {
  backfillSubjectYearAverages,
  buildPassFailResultsByStudentId,
  buildYearSubjectAveragesByStudentId,
} from '../../src/common/utils/subject-year-average.util';

export interface FinalizeSemesterSeedResult {
  assessmentsLocked: number;
  subjectResultsClosed: number;
  semesterSummariesClosed: number;
  conductRecordsClosed: number;
}

export async function lockSemesterAssessments(
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

export async function finalizeSemesterSummaries(
  prisma: PrismaClient,
  schoolId: string,
  semesterId: string,
): Promise<FinalizeSemesterSeedResult> {
  const assessmentsLocked = await lockSemesterAssessments(
    prisma,
    schoolId,
    semesterId,
  );
  const now = new Date();

  const [subjectClosed, summaryClosed, conductClosed] =
    await prisma.$transaction([
      prisma.studentSubjectResult.updateMany({
        where: { schoolId, semesterId, status: SummaryStatus.DRAFT },
        data: { status: SummaryStatus.CLOSED },
      }),
      prisma.studentSemesterSummary.updateMany({
        where: { schoolId, semesterId, status: SummaryStatus.DRAFT },
        data: {
          status: SummaryStatus.CLOSED,
          finalizedAt: now,
        },
      }),
      prisma.studentConductRecord.updateMany({
        where: { schoolId, semesterId, status: SummaryStatus.DRAFT },
        data: { status: SummaryStatus.CLOSED },
      }),
    ]);

  return {
    assessmentsLocked,
    subjectResultsClosed: subjectClosed.count,
    semesterSummariesClosed: summaryClosed.count,
    conductRecordsClosed: conductClosed.count,
  };
}

export interface YearSummariesSeedResult {
  yearSummariesUpserted: number;
  promotedCount: number;
  retainedCount: number;
  graduatedCount: number;
  pendingCount: number;
}

export async function seedYearSummariesForAcademicYear(
  prisma: PrismaClient,
  schoolId: string,
  academicYearId: string,
): Promise<YearSummariesSeedResult> {
  const semesters = await prisma.semester.findMany({
    where: { schoolId, academicYearId },
    select: { id: true, code: true },
    orderBy: { startDate: 'asc' },
  });

  const hk1 = semesters.find((row) => row.code === 'HK1');
  const hk2 = semesters.find((row) => row.code === 'HK2');

  if (!hk1 || !hk2) {
    throw new Error('Academic year must have both HK1 and HK2');
  }

  console.log('Backfill year_average trên student_subject_results...');
  const backfilledGroups = await backfillSubjectYearAverages(
    prisma,
    schoolId,
    academicYearId,
  );
  console.log(`  ${backfilledGroups} nhóm môn đã cập nhật year_average`);

  const gradeLevels = await prisma.gradeLevel.findMany({
    where: { schoolId },
    select: { code: true },
  });
  const allGradeCodes = gradeLevels.map((row) => row.code);

  const homeroomClasses = await prisma.homeroomClass.findMany({
    where: { schoolId, academicYearId, status: 'ACTIVE' },
    select: {
      id: true,
      gradeLevel: { select: { code: true } },
    },
  });

  let yearSummariesUpserted = 0;
  let promotedCount = 0;
  let retainedCount = 0;
  let graduatedCount = 0;
  let pendingCount = 0;

  for (const homeroomClass of homeroomClasses) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        homeroomClassId: homeroomClass.id,
        status: { in: STUDENT_YEAR_ENROLLMENT_STATUSES },
        semester: { academicYearId },
      },
      select: { studentId: true },
      distinct: ['studentId'],
    });

    const studentIds = [...new Set(enrollments.map((row) => row.studentId))];
    if (studentIds.length === 0) {
      continue;
    }

    const isGraduatingGrade = isGraduatingGradeLevel(
      homeroomClass.gradeLevel.code,
      allGradeCodes,
    );

    const [semesterSummaries, conductRecords, absenceGroups, subjectResults] =
      await Promise.all([
        prisma.studentSemesterSummary.findMany({
          where: {
            schoolId,
            studentId: { in: studentIds },
            semesterId: { in: [hk1.id, hk2.id] },
          },
          select: {
            studentId: true,
            overallAverage: true,
            academicResultLevel: true,
            trainingResultLevel: true,
            status: true,
            semester: { select: { code: true } },
          },
        }),
        prisma.studentConductRecord.findMany({
          where: {
            schoolId,
            studentId: { in: studentIds },
            semesterId: { in: [hk1.id, hk2.id] },
          },
          select: {
            studentId: true,
            semesterId: true,
            trainingResultLevel: true,
            status: true,
          },
        }),
        prisma.attendanceRecord.groupBy({
          by: ['studentId'],
          where: {
            schoolId,
            studentId: { in: studentIds },
            status: AttendanceRecordStatus.ABSENT,
            session: {
              semesterId: { in: [hk1.id, hk2.id] },
            },
          },
          _count: { _all: true },
        }),
        prisma.studentSubjectResult.findMany({
          where: {
            schoolId,
            studentId: { in: studentIds },
            semesterId: { in: [hk1.id, hk2.id] },
          },
          select: {
            studentId: true,
            yearAverage: true,
            semesterAverage: true,
            evaluationMode: true,
            passFailResult: true,
            semester: { select: { code: true } },
            courseSection: { select: { code: true } },
          },
        }),
      ]);

    const yearAvgsByStudent = buildYearSubjectAveragesByStudentId(
      subjectResults
        .filter((row) => row.evaluationMode === 'NUMERIC')
        .map((row) => ({
          studentId: row.studentId,
          courseSectionCode: row.courseSection.code,
          semesterCode: row.semester.code,
          semesterAverage: row.semesterAverage?.toNumber() ?? null,
          yearAverage: row.yearAverage?.toNumber() ?? null,
        })),
    );

    const passFailByStudent = buildPassFailResultsByStudentId(
      subjectResults
        .filter((row) => row.evaluationMode === 'PASS_FAIL')
        .map((row) => ({
          studentId: row.studentId,
          courseSectionCode: row.courseSection.code,
          semesterCode: row.semester.code,
          passFailResult: row.passFailResult,
        })),
    );

    const absenceByStudentId = new Map(
      absenceGroups.map((row) => [row.studentId, row._count._all]),
    );

    for (const studentId of studentIds) {
      const studentSemesterSummaries = semesterSummaries.filter(
        (row) => row.studentId === studentId,
      );
      const hk1Summary = studentSemesterSummaries.find(
        (row) => row.semester.code === 'HK1',
      );
      const hk2Summary = studentSemesterSummaries.find(
        (row) => row.semester.code === 'HK2',
      );

      const hk1Conduct = conductRecords.find(
        (row) => row.studentId === studentId && row.semesterId === hk1.id,
      );
      const hk2Conduct = conductRecords.find(
        (row) => row.studentId === studentId && row.semesterId === hk2.id,
      );

      const hk1Average = hk1Summary?.overallAverage?.toNumber() ?? null;
      const hk2Average = hk2Summary?.overallAverage?.toNumber() ?? null;
      const yearOverallAverage = computeYearOverallAverage(
        hk1Average,
        hk2Average,
      );

      const academicResultLevel = resolveYearAcademicResultLevel({
        hk1: hk1Summary?.academicResultLevel ?? null,
        hk2: hk2Summary?.academicResultLevel ?? null,
        yearOverallAverage,
        yearSubjectAverages: yearAvgsByStudent.get(studentId) ?? [],
        passFailResults: passFailByStudent.get(studentId) ?? [],
      });

      const trainingResultLevel = resolveYearTrainingResultLevel(
        hk1Conduct?.trainingResultLevel ??
          hk1Summary?.trainingResultLevel ??
          null,
        hk2Conduct?.trainingResultLevel ??
          hk2Summary?.trainingResultLevel ??
          null,
      );

      const hasCompleteYearData =
        hk1Summary?.status === SummaryStatus.CLOSED &&
        hk2Summary?.status === SummaryStatus.CLOSED &&
        hk1Conduct?.status === SummaryStatus.CLOSED &&
        hk2Conduct?.status === SummaryStatus.CLOSED &&
        yearOverallAverage != null;

      const absentSessionCount = absenceByStudentId.get(studentId) ?? 0;

      const promotionDecision = resolvePromotionDecision({
        academicResultLevel,
        trainingResultLevel,
        yearOverallAverage,
        absentSessionCount,
        hasCompleteYearData,
        isGraduatingGrade,
      });

      switch (promotionDecision) {
        case PromotionDecision.PROMOTED:
          promotedCount += 1;
          break;
        case PromotionDecision.RETAINED:
          retainedCount += 1;
          break;
        case PromotionDecision.GRADUATED:
          graduatedCount += 1;
          break;
        default:
          pendingCount += 1;
      }

      const existing = await prisma.studentYearSummary.findUnique({
        where: {
          studentId_academicYearId: {
            studentId,
            academicYearId,
          },
        },
        select: { id: true, status: true },
      });

      if (existing?.status === SummaryStatus.CLOSED) {
        continue;
      }

      const data = {
        schoolId,
        studentId,
        academicYearId,
        homeroomClassId: homeroomClass.id,
        overallAverage:
          yearOverallAverage != null
            ? new Prisma.Decimal(yearOverallAverage)
            : null,
        academicResultLevel,
        trainingResultLevel,
        promotionDecision,
        absentSessionCount,
        status: SummaryStatus.DRAFT,
        finalizedAt: null,
      };

      if (existing) {
        await prisma.studentYearSummary.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await prisma.studentYearSummary.create({ data });
      }

      yearSummariesUpserted += 1;
    }
  }

  return {
    yearSummariesUpserted,
    promotedCount,
    retainedCount,
    graduatedCount,
    pendingCount,
  };
}

export async function setCurrentSemester(
  prisma: PrismaClient,
  schoolId: string,
  semesterId: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.semester.updateMany({
      where: { schoolId, isCurrent: true },
      data: { isCurrent: false },
    }),
    prisma.semester.update({
      where: { id: semesterId },
      data: { isCurrent: true },
    }),
  ]);
}
