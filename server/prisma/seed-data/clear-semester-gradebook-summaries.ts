import { AssessmentStatus, PrismaClient } from '@prisma/client';

export interface ClearSemesterGradebookSummariesResult {
  semesterId: string;
  semesterCode: string;
  academicYearId: string;
  deleted: {
    scores: number;
    subjectResults: number;
    semesterSummaries: number;
    conductRecords: number;
    yearSummaries: number;
  };
  assessmentsReopened: number;
}

export async function clearSemesterGradebookAndSummaries(
  prisma: PrismaClient,
  semesterId: string,
): Promise<ClearSemesterGradebookSummariesResult> {
  const semester = await prisma.semester.findUniqueOrThrow({
    where: { id: semesterId },
    select: {
      id: true,
      code: true,
      schoolId: true,
      academicYearId: true,
    },
  });

  const assessmentIds = (
    await prisma.assessment.findMany({
      where: { schoolId: semester.schoolId, semesterId: semester.id },
      select: { id: true },
    })
  ).map((row) => row.id);

  const deleted = {
    scores: 0,
    subjectResults: 0,
    semesterSummaries: 0,
    conductRecords: 0,
    yearSummaries: 0,
  };

  let assessmentsReopened = 0;

  await prisma.$transaction(async (tx) => {
    if (assessmentIds.length > 0) {
      const scores = await tx.score.deleteMany({
        where: { assessmentId: { in: assessmentIds } },
      });
      deleted.scores = scores.count;
    }

    const reopened = await tx.assessment.updateMany({
      where: {
        schoolId: semester.schoolId,
        semesterId: semester.id,
        status: AssessmentStatus.CLOSED,
      },
      data: { status: AssessmentStatus.OPEN },
    });
    assessmentsReopened = reopened.count;

    const [subjectResults, semesterSummaries, conductRecords, yearSummaries] =
      await Promise.all([
        tx.studentSubjectResult.deleteMany({
          where: { schoolId: semester.schoolId, semesterId: semester.id },
        }),
        tx.studentSemesterSummary.deleteMany({
          where: { schoolId: semester.schoolId, semesterId: semester.id },
        }),
        tx.studentConductRecord.deleteMany({
          where: { schoolId: semester.schoolId, semesterId: semester.id },
        }),
        tx.studentYearSummary.deleteMany({
          where: {
            schoolId: semester.schoolId,
            academicYearId: semester.academicYearId,
          },
        }),
      ]);

    deleted.subjectResults = subjectResults.count;
    deleted.semesterSummaries = semesterSummaries.count;
    deleted.conductRecords = conductRecords.count;
    deleted.yearSummaries = yearSummaries.count;
  });

  return {
    semesterId: semester.id,
    semesterCode: semester.code,
    academicYearId: semester.academicYearId,
    deleted,
    assessmentsReopened,
  };
}
