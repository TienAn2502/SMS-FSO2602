import {
  AcademicResultLevel,
  EnrollmentStatus,
  PassFailResult,
  Prisma,
  PrismaClient,
  PromotionDecision,
  SubjectEvaluationMode,
  SummaryStatus,
} from '@prisma/client';

import {
  computeOverallAverage,
  computePassFailResult,
  computeSubjectSemesterAverage,
  resolveAcademicResultLevel,
  type SubjectScoreInput,
} from '../../src/common/utils/gradebook-average.util';
import { upsertStudentConductRecord, resolveSeedTrainingResultLevel } from './conduct';

export interface SummariesSeedResult {
  subjectResultCount: number;
  conductRecordCount: number;
  semesterSummaryCount: number;
  yearSummaryCount: number;
  homeroomClassCount: number;
  studentCount: number;
}

async function loadSubjectScoreInputs(
  prisma: PrismaClient,
  schoolId: string,
  courseSectionId: string,
  studentId: string,
): Promise<SubjectScoreInput[]> {
  const assessments = await prisma.assessment.findMany({
    where: { schoolId, courseSectionId },
    select: {
      type: true,
      scores: {
        where: { studentId },
        select: { score: true, note: true },
        take: 1,
      },
    },
    orderBy: [{ assessmentDate: 'asc' }, { name: 'asc' }],
  });

  return assessments.map((assessment) => {
    const scoreRow = assessment.scores[0];
    return {
      type: assessment.type,
      score: scoreRow?.score?.toNumber() ?? null,
      note: scoreRow?.note ?? null,
    };
  });
}

async function seedHomeroomClassSummaries(
  prisma: PrismaClient,
  params: {
    schoolId: string;
    semesterId: string;
    homeroomClass: {
      id: string;
      homeroomTeacherId: string | null;
      academicYearId: string;
    };
  },
): Promise<{
  subjectResultCount: number;
  conductRecordCount: number;
  semesterSummaryCount: number;
  yearSummaryCount: number;
  studentCount: number;
}> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolId: params.schoolId,
      semesterId: params.semesterId,
      homeroomClassId: params.homeroomClass.id,
      status: EnrollmentStatus.ACTIVE,
    },
    select: { studentId: true },
    orderBy: { enrolledAt: 'asc' },
  });

  if (enrollments.length === 0) {
    return {
      subjectResultCount: 0,
      conductRecordCount: 0,
      semesterSummaryCount: 0,
      yearSummaryCount: 0,
      studentCount: 0,
    };
  }

  const courseSections = await prisma.courseSection.findMany({
    where: {
      schoolId: params.schoolId,
      semesterId: params.semesterId,
      homeroomClassId: params.homeroomClass.id,
    },
    select: {
      id: true,
      gradeLevelSubject: {
        select: { evaluationMode: true },
      },
    },
    orderBy: { code: 'asc' },
  });

  if (courseSections.length === 0) {
    throw new Error(
      `No course sections found for summaries seed (homeroom ${params.homeroomClass.id})`,
    );
  }

  const computedAt = new Date('2026-01-15T10:00:00.000Z');
  let subjectResultCount = 0;
  let conductRecordCount = 0;
  let semesterSummaryCount = 0;
  let yearSummaryCount = 0;

  for (const [index, enrollment] of enrollments.entries()) {
    const trainingResultLevel = resolveSeedTrainingResultLevel(index);

    await upsertStudentConductRecord(prisma, {
      schoolId: params.schoolId,
      studentId: enrollment.studentId,
      semesterId: params.semesterId,
      homeroomClassId: params.homeroomClass.id,
      homeroomTeacherId: params.homeroomClass.homeroomTeacherId,
      studentIndex: index,
      status: SummaryStatus.DRAFT,
    });
    conductRecordCount += 1;

    const subjectAverages: number[] = [];
    const passFailResults: PassFailResult[] = [];

    for (const courseSection of courseSections) {
      const evaluationMode = courseSection.gradeLevelSubject.evaluationMode;
      const inputs = await loadSubjectScoreInputs(
        prisma,
        params.schoolId,
        courseSection.id,
        enrollment.studentId,
      );

      if (evaluationMode === SubjectEvaluationMode.NUMERIC) {
        const computed = computeSubjectSemesterAverage(inputs);

        if (computed.semesterAverage != null) {
          subjectAverages.push(computed.semesterAverage);
        }

        await prisma.studentSubjectResult.create({
          data: {
            schoolId: params.schoolId,
            studentId: enrollment.studentId,
            courseSectionId: courseSection.id,
            semesterId: params.semesterId,
            evaluationMode: SubjectEvaluationMode.NUMERIC,
            regularAverage:
              computed.regularAverage != null
                ? new Prisma.Decimal(computed.regularAverage)
                : null,
            midtermScore:
              computed.midtermScore != null
                ? new Prisma.Decimal(computed.midtermScore)
                : null,
            finalScore:
              computed.finalScore != null
                ? new Prisma.Decimal(computed.finalScore)
                : null,
            semesterAverage:
              computed.semesterAverage != null
                ? new Prisma.Decimal(computed.semesterAverage)
                : null,
            yearAverage: null,
            passFailResult: null,
            computedAt,
            status: SummaryStatus.DRAFT,
          },
        });
      } else {
        const passFailResult = computePassFailResult(inputs);
        passFailResults.push(passFailResult);

        await prisma.studentSubjectResult.create({
          data: {
            schoolId: params.schoolId,
            studentId: enrollment.studentId,
            courseSectionId: courseSection.id,
            semesterId: params.semesterId,
            evaluationMode: SubjectEvaluationMode.PASS_FAIL,
            regularAverage: null,
            midtermScore: null,
            finalScore: null,
            semesterAverage: null,
            yearAverage: null,
            passFailResult,
            computedAt,
            status: SummaryStatus.DRAFT,
          },
        });
      }

      subjectResultCount += 1;
    }

    const overallAverage = computeOverallAverage(subjectAverages);
    const academicResultLevel: AcademicResultLevel | null =
      resolveAcademicResultLevel({
        numericSubjectAverages: subjectAverages,
        passFailResults,
      });

    await prisma.studentSemesterSummary.create({
      data: {
        schoolId: params.schoolId,
        studentId: enrollment.studentId,
        semesterId: params.semesterId,
        homeroomClassId: params.homeroomClass.id,
        overallAverage:
          overallAverage != null ? new Prisma.Decimal(overallAverage) : null,
        academicResultLevel,
        trainingResultLevel,
        subjectCount: subjectAverages.length,
        status: SummaryStatus.DRAFT,
        finalizedAt: null,
      },
    });
    semesterSummaryCount += 1;

    await prisma.studentYearSummary.create({
      data: {
        schoolId: params.schoolId,
        studentId: enrollment.studentId,
        academicYearId: params.homeroomClass.academicYearId,
        homeroomClassId: params.homeroomClass.id,
        overallAverage: null,
        academicResultLevel: null,
        trainingResultLevel: null,
        promotionDecision: PromotionDecision.PENDING,
        nextHomeroomClassId: null,
        note: null,
        status: SummaryStatus.DRAFT,
      },
    });
    yearSummaryCount += 1;
  }

  return {
    subjectResultCount,
    conductRecordCount,
    semesterSummaryCount,
    yearSummaryCount,
    studentCount: enrollments.length,
  };
}

export async function seedSummaries(
  prisma: PrismaClient,
  schoolId: string,
  semesterId: string,
): Promise<SummariesSeedResult> {
  await prisma.studentSubjectResult.deleteMany({
    where: { schoolId, semesterId },
  });
  await prisma.studentConductRecord.deleteMany({
    where: { schoolId, semesterId },
  });
  await prisma.studentSemesterSummary.deleteMany({
    where: { schoolId, semesterId },
  });
  await prisma.studentYearSummary.deleteMany({
    where: {
      schoolId,
      status: SummaryStatus.DRAFT,
      academicYear: { semesters: { some: { id: semesterId } } },
    },
  });

  const homeroomClasses = await prisma.homeroomClass.findMany({
    where: {
      schoolId,
      courseSections: { some: { semesterId } },
    },
    select: {
      id: true,
      code: true,
      homeroomTeacherId: true,
      academicYearId: true,
    },
    orderBy: { code: 'asc' },
  });

  if (homeroomClasses.length === 0) {
    throw new Error('No homeroom classes found for summaries seed');
  }

  let subjectResultCount = 0;
  let conductRecordCount = 0;
  let semesterSummaryCount = 0;
  let yearSummaryCount = 0;
  let studentCount = 0;

  for (const homeroomClass of homeroomClasses) {
    const result = await seedHomeroomClassSummaries(prisma, {
      schoolId,
      semesterId,
      homeroomClass,
    });

    subjectResultCount += result.subjectResultCount;
    conductRecordCount += result.conductRecordCount;
    semesterSummaryCount += result.semesterSummaryCount;
    yearSummaryCount += result.yearSummaryCount;
    studentCount += result.studentCount;
  }

  return {
    subjectResultCount,
    conductRecordCount,
    semesterSummaryCount,
    yearSummaryCount,
    homeroomClassCount: homeroomClasses.length,
    studentCount,
  };
}
