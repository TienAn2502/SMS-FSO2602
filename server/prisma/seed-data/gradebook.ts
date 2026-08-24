import {
  AssessmentStatus,
  AssessmentType,
  Prisma,
  PrismaClient,
  SubjectEvaluationMode,
} from '@prisma/client';

import {
  getRegularAssessmentQuota,
} from '../../src/common/utils/assessment-quota.util';
import { GRADEBOOK_ENROLLMENT_STATUSES } from '../../src/common/utils/enrollment-status.util';

/** Mức năng lực cơ bản theo vị trí trong lớp. */
const STUDENT_TIER_BASE: Record<number, number> = {
  0: 5.0,
  1: 5.5,
  2: 6.0,
  3: 6.5,
  4: 7.0,
  5: 7.5,
  6: 8.0,
  7: 8.5,
  8: 9.0,
  9: 9.2,
};

/** Độ mạnh/yếu từng môn so với năng lực chung của HS. */
const SUBJECT_AFFINITY_PRESET: Record<string, number> = {
  TOAN: 0,
  VAN: 0.3,
  ANH: -0.5,
  LY: 0.15,
  HOA: -0.15,
  SINH: 0.05,
  SU: 0.25,
  DIA: 0.1,
  GKTPL: 0,
  TIN: 0.2,
  CN: -0.1,
  TD: 0,
  GDQP: 0.1,
  HDTN: 0,
};

export interface GradebookSeedResult {
  assessmentCount: number;
  scoreCount: number;
  courseSectionCount: number;
  homeroomClassCount: number;
  studentCount: number;
}

function offsetDate(base: Date, days: number): Date {
  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function clampScore(value: number): number {
  const clamped = Math.max(4, Math.min(9.5, value));
  return Math.round(clamped * 2) / 2;
}

function getSubjectAffinity(studentIndex: number, subjectCode: string): number {
  const preset = SUBJECT_AFFINITY_PRESET[subjectCode] ?? 0;
  const personalShift =
    ((studentIndex * 11 + subjectCode.charCodeAt(0)) % 5 - 2) * 0.12;
  return preset + personalShift;
}

function pickNumericScore(
  studentIndex: number,
  slotIndex: number,
  type: AssessmentType,
  subjectCode: string,
): { score: Prisma.Decimal; note: null } {
  const tierBase = STUDENT_TIER_BASE[studentIndex % 10] ?? 7;
  const affinity = getSubjectAffinity(studentIndex, subjectCode);
  const personalNoise = ((studentIndex * 3 + slotIndex * 5) % 7 - 3) * 0.15;
  const examShift =
    type === AssessmentType.MIDTERM
      ? ((studentIndex % 4) - 1.5) * 0.2
      : type === AssessmentType.FINAL
        ? ((studentIndex % 3) - 1) * 0.15
        : 0;

  const raw = tierBase + affinity + personalNoise + examShift;
  return {
    score: new Prisma.Decimal(clampScore(raw)),
    note: null,
  };
}

function pickPassFailScore(
  studentIndex: number,
  slotIndex: number,
  subjectCode: string,
): { score: Prisma.Decimal; note: null } {
  const base =
    6 +
    (studentIndex % 4) +
    slotIndex * 0.4 +
    (subjectCode.charCodeAt(0) % 3) * 0.2;
  return {
    score: new Prisma.Decimal(clampScore(base)),
    note: null,
  };
}

async function seedCourseSectionGradebook(
  prisma: PrismaClient,
  params: {
    schoolId: string;
    semesterId: string;
    semesterStart: Date;
    semesterEnd: Date;
    courseSectionId: string;
    teacherId: string;
    evaluationMode: SubjectEvaluationMode;
    periodsPerYear: number | null;
    studentIds: string[];
    subjectCode: string;
  },
): Promise<{ assessmentCount: number; scoreCount: number }> {
  const txQuota = getRegularAssessmentQuota(
    params.periodsPerYear,
    params.evaluationMode,
  );

  if (txQuota == null) {
    throw new Error(
      `Missing periods per year for gradebook seed (${params.subjectCode})`,
    );
  }

  const semesterMidpoint = offsetDate(
    params.semesterStart,
    Math.floor(daysBetween(params.semesterStart, params.semesterEnd) / 2),
  );

  const assessmentPlans: Array<{
    type: AssessmentType;
    name: string;
    assessmentDate: Date;
    slotIndex: number;
  }> = [];

  const txSpacingDays =
    txQuota > 1
      ? Math.floor(
          daysBetween(params.semesterStart, params.semesterEnd) / txQuota,
        )
      : 0;

  for (let index = 0; index < txQuota; index += 1) {
    assessmentPlans.push({
      type: AssessmentType.REGULAR,
      name: `Điểm TX ${index + 1}`,
      assessmentDate: offsetDate(params.semesterStart, index * txSpacingDays),
      slotIndex: index,
    });
  }

  if (params.evaluationMode === SubjectEvaluationMode.NUMERIC) {
    assessmentPlans.push(
      {
        type: AssessmentType.MIDTERM,
        name: 'Kiểm tra giữa kỳ',
        assessmentDate: semesterMidpoint,
        slotIndex: txQuota,
      },
      {
        type: AssessmentType.FINAL,
        name: 'Kiểm tra cuối kỳ',
        assessmentDate: offsetDate(params.semesterEnd, -7),
        slotIndex: txQuota + 1,
      },
    );
  }

  let assessmentCount = 0;
  let scoreCount = 0;

  for (const plan of assessmentPlans) {
    const assessment = await prisma.assessment.create({
      data: {
        schoolId: params.schoolId,
        semesterId: params.semesterId,
        courseSectionId: params.courseSectionId,
        teacherId: params.teacherId,
        type: plan.type,
        name: plan.name,
        assessmentDate: plan.assessmentDate,
        maxScore: new Prisma.Decimal(10),
        status: AssessmentStatus.OPEN,
        note: null,
      },
    });

    assessmentCount += 1;

    const createdScores = await prisma.score.createMany({
      data: params.studentIds.map((studentId, studentIndex) => {
        const picked =
          params.evaluationMode === SubjectEvaluationMode.PASS_FAIL
            ? pickPassFailScore(
                studentIndex,
                plan.slotIndex,
                params.subjectCode,
              )
            : pickNumericScore(
                studentIndex,
                plan.slotIndex,
                plan.type,
                params.subjectCode,
              );

        return {
          schoolId: params.schoolId,
          assessmentId: assessment.id,
          studentId,
          score: picked.score,
          note: picked.note,
        };
      }),
    });

    scoreCount += createdScores.count;
  }

  return { assessmentCount, scoreCount };
}

export async function seedGradebook(
  prisma: PrismaClient,
  schoolId: string,
  semesterId: string,
  options?: {
    /** Chỉ seed các lớp HC này (mã lớp). */
    homeroomClassCodes?: string[];
    /** Bỏ qua các mã lớp môn (vd. TOAN-10A1). */
    excludeCourseSectionCodes?: string[];
    /** Chỉ seed các mã lớp môn này (vd. TOAN-10A1). */
    includeCourseSectionCodes?: string[];
    /**
     * true (mặc định): xóa toàn bộ assessment/score của học kỳ rồi seed lại.
     * false: chỉ bổ sung lớp/môn chưa có sổ điểm (không đụng dữ liệu đã có).
     */
    replaceExisting?: boolean;
  },
): Promise<GradebookSeedResult> {
  const replaceExisting = options?.replaceExisting ?? true;
  const filterCodes = options?.homeroomClassCodes?.map((code) =>
    code.trim().toUpperCase(),
  );
  const excludeSectionCodes = new Set(
    (options?.excludeCourseSectionCodes ?? []).map((code) =>
      code.trim().toUpperCase(),
    ),
  );
  const includeSectionCodes = new Set(
    (options?.includeCourseSectionCodes ?? []).map((code) =>
      code.trim().toUpperCase(),
    ),
  );

  const semester = await prisma.semester.findFirstOrThrow({
    where: { id: semesterId, schoolId },
    select: { startDate: true, endDate: true },
  });

  if (replaceExisting) {
    await prisma.score.deleteMany({
      where: { schoolId, assessment: { semesterId } },
    });
    await prisma.assessment.deleteMany({ where: { schoolId, semesterId } });
  }

  const homeroomClasses = await prisma.homeroomClass.findMany({
    where: {
      schoolId,
      courseSections: { some: { semesterId } },
      ...(filterCodes && filterCodes.length > 0
        ? { code: { in: filterCodes, mode: 'insensitive' } }
        : {}),
    },
    select: { id: true, code: true },
    orderBy: { code: 'asc' },
  });

  if (homeroomClasses.length === 0) {
    throw new Error('No homeroom classes found for gradebook seed');
  }

  let assessmentCount = 0;
  let scoreCount = 0;
  let courseSectionCount = 0;
  const studentIdsSeen = new Set<string>();

  for (const homeroomClass of homeroomClasses) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId,
        homeroomClassId: homeroomClass.id,
        status: { in: GRADEBOOK_ENROLLMENT_STATUSES },
      },
      select: { studentId: true },
      orderBy: { enrolledAt: 'asc' },
    });

    if (enrollments.length === 0) {
      continue;
    }

    const studentIds = enrollments.map((row) => row.studentId);
    studentIds.forEach((studentId) => studentIdsSeen.add(studentId));

    const courseSections = await prisma.courseSection.findMany({
      where: {
        schoolId,
        semesterId,
        homeroomClassId: homeroomClass.id,
      },
      include: {
        teachingAssignments: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
        gradeLevelSubject: {
          select: {
            periodsPerYear: true,
            evaluationMode: true,
            subject: { select: { code: true } },
          },
        },
        _count: { select: { assessments: true } },
      },
      orderBy: { code: 'asc' },
    });

    for (const courseSection of courseSections) {
      const sectionCode = courseSection.code.trim().toUpperCase();
      if (excludeSectionCodes.has(sectionCode)) {
        continue;
      }
      if (
        includeSectionCodes.size > 0 &&
        !includeSectionCodes.has(sectionCode)
      ) {
        continue;
      }

      if (!replaceExisting && courseSection._count.assessments > 0) {
        continue;
      }

      const assignment = courseSection.teachingAssignments[0];
      if (!assignment) {
        throw new Error(`No teaching assignment for ${courseSection.code}`);
      }

      const result = await seedCourseSectionGradebook(prisma, {
        schoolId,
        semesterId,
        semesterStart: semester.startDate,
        semesterEnd: semester.endDate,
        courseSectionId: courseSection.id,
        teacherId: assignment.teacherId,
        evaluationMode: courseSection.gradeLevelSubject.evaluationMode,
        periodsPerYear: courseSection.gradeLevelSubject.periodsPerYear,
        studentIds,
        subjectCode: courseSection.gradeLevelSubject.subject.code,
      });

      assessmentCount += result.assessmentCount;
      scoreCount += result.scoreCount;
      courseSectionCount += 1;
    }
  }

  return {
    assessmentCount,
    scoreCount,
    courseSectionCount,
    homeroomClassCount: homeroomClasses.length,
    studentCount: studentIdsSeen.size,
  };
}
