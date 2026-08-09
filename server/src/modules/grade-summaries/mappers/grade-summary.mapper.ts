import type { Prisma } from '@prisma/client';

export const subjectResultListInclude = {
  student: { select: { id: true, fullName: true } },
  courseSection: {
    select: {
      id: true,
      code: true,
      gradeLevelSubject: {
        select: {
          subject: { select: { id: true, name: true } },
        },
      },
    },
  },
  semester: { select: { id: true, name: true, code: true } },
} satisfies Prisma.StudentSubjectResultInclude;

export const semesterSummaryListInclude = {
  student: { select: { id: true, fullName: true } },
  semester: { select: { id: true, name: true, code: true } },
  homeroomClass: { select: { id: true, code: true, name: true } },
} satisfies Prisma.StudentSemesterSummaryInclude;

export const yearSummaryListInclude = {
  student: { select: { id: true, fullName: true } },
  academicYear: { select: { id: true, name: true, code: true } },
  homeroomClass: {
    select: {
      id: true,
      code: true,
      name: true,
      gradeLevel: { select: { code: true } },
    },
  },
  nextHomeroomClass: { select: { id: true, code: true, name: true } },
} satisfies Prisma.StudentYearSummaryInclude;

export type SubjectResultListRow = Prisma.StudentSubjectResultGetPayload<{
  include: typeof subjectResultListInclude;
}>;

export type SemesterSummaryListRow = Prisma.StudentSemesterSummaryGetPayload<{
  include: typeof semesterSummaryListInclude;
}>;

export type YearSummaryListRow = Prisma.StudentYearSummaryGetPayload<{
  include: typeof yearSummaryListInclude;
}>;

export function toSubjectResultListItem(row: SubjectResultListRow) {
  return {
    id: row.id,
    studentId: row.studentId,
    studentFullName: row.student.fullName,
    courseSectionId: row.courseSectionId,
    courseSectionCode: row.courseSection.code,
    subjectName: row.courseSection.gradeLevelSubject.subject.name,
    semesterId: row.semesterId,
    semesterName: row.semester.name,
    evaluationMode: row.evaluationMode,
    regularAverage: row.regularAverage?.toNumber() ?? null,
    midtermScore: row.midtermScore?.toNumber() ?? null,
    finalScore: row.finalScore?.toNumber() ?? null,
    semesterAverage: row.semesterAverage?.toNumber() ?? null,
    yearAverage: row.yearAverage?.toNumber() ?? null,
    passFailResult: row.passFailResult,
    status: row.status,
    computedAt: row.computedAt.toISOString(),
  };
}

export function toSemesterSummaryListItem(row: SemesterSummaryListRow) {
  return {
    id: row.id,
    studentId: row.studentId,
    studentFullName: row.student.fullName,
    semesterId: row.semesterId,
    semesterName: row.semester.name,
    homeroomClassId: row.homeroomClassId,
    homeroomClassCode: row.homeroomClass.code,
    overallAverage: row.overallAverage?.toNumber() ?? null,
    academicResultLevel: row.academicResultLevel,
    trainingResultLevel: row.trainingResultLevel,
    subjectCount: row.subjectCount,
    status: row.status,
    finalizedAt: row.finalizedAt?.toISOString() ?? null,
  };
}

export function toYearSummaryListItem(row: YearSummaryListRow) {
  return {
    id: row.id,
    studentId: row.studentId,
    studentFullName: row.student.fullName,
    academicYearId: row.academicYearId,
    academicYearName: row.academicYear.name,
    homeroomClassId: row.homeroomClassId,
    homeroomClassCode: row.homeroomClass.code,
    gradeLevelCode: row.homeroomClass.gradeLevel.code,
    overallAverage: row.overallAverage?.toNumber() ?? null,
    academicResultLevel: row.academicResultLevel,
    trainingResultLevel: row.trainingResultLevel,
    promotionDecision: row.promotionDecision,
    absentSessionCount: row.absentSessionCount,
    nextHomeroomClassId: row.nextHomeroomClassId,
    nextHomeroomClassCode: row.nextHomeroomClass?.code ?? null,
    note: row.note,
    status: row.status,
    finalizedAt: row.finalizedAt?.toISOString() ?? null,
  };
}
