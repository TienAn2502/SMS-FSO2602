import type {
  Assessment,
  CourseSection,
  Score,
  Semester,
  Student,
  Teacher,
} from '@prisma/client';
import { Prisma } from '@prisma/client';

import { toIsoDateString } from '@/common/schemas/academic.schema';

type ScoreWithStudent = Score & {
  student: Pick<Student, 'id' | 'fullName'>;
};

type AssessmentWithRelations = Assessment & {
  teacher: Pick<Teacher, 'id' | 'fullName'>;
  courseSection: Pick<CourseSection, 'id' | 'code' | 'name' | 'homeroomClassId'> & {
    semester: Pick<Semester, 'id' | 'name' | 'code' | 'academicYearId'>;
  };
  scores?: ScoreWithStudent[];
  _count?: { scores: number };
};

export interface ScoreSummary {
  id: string;
  studentId: string;
  studentFullName: string;
  score: number | null;
  note: string | null;
}

export interface AssessmentResponse {
  id: string;
  semesterId: string;
  semesterName: string;
  academicYearId: string;
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  homeroomClassId: string | null;
  teacherId: string;
  teacherFullName: string;
  type: Assessment['type'];
  name: string;
  assessmentDate: string;
  maxScore: number;
  weight: number | null;
  status: Assessment['status'];
  note: string | null;
  scoreCount: number;
  scoredCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentDetailResponse extends AssessmentResponse {
  scores: ScoreSummary[];
}

export type GradebookOverviewStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'LOCKED';

export interface GradebookOverviewItem {
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  semesterId: string;
  semesterName: string;
  academicYearId: string;
  academicYearName: string;
  homeroomClassCode: string | null;
  subjectCode: string;
  subjectName: string;
  teacherId: string | null;
  teacherFullName: string | null;
  assessmentCount: number;
  expectedAssessmentCount: number;
  scoreCount: number;
  scoredCount: number;
  openAssessmentCount: number;
  gradebookStatus: GradebookOverviewStatus;
  isLocked: boolean;
}

export const assessmentInclude = {
  teacher: {
    select: { id: true, fullName: true },
  },
  courseSection: {
    select: {
      id: true,
      code: true,
      name: true,
      homeroomClassId: true,
      semester: {
        select: { id: true, name: true, code: true, academicYearId: true },
      },
    },
  },
  _count: {
    select: { scores: true },
  },
} as const;

export const assessmentDetailInclude = {
  ...assessmentInclude,
  scores: {
    orderBy: { student: { fullName: 'asc' as const } },
    include: {
      student: {
        select: { id: true, fullName: true },
      },
    },
  },
} as const;

function decimalToNumber(value: Prisma.Decimal | null): number | null {
  if (value == null) {
    return null;
  }
  return value.toNumber();
}

function toScoreSummary(score: ScoreWithStudent): ScoreSummary {
  return {
    id: score.id,
    studentId: score.studentId,
    studentFullName: score.student.fullName,
    score: decimalToNumber(score.score),
    note: score.note,
  };
}

export function toAssessmentResponse(
  assessment: AssessmentWithRelations,
  scoredCount = 0,
): AssessmentResponse {
  return {
    id: assessment.id,
    semesterId: assessment.semesterId,
    semesterName: assessment.courseSection.semester.name,
    academicYearId: assessment.courseSection.semester.academicYearId,
    courseSectionId: assessment.courseSectionId,
    courseSectionCode: assessment.courseSection.code,
    courseSectionName: assessment.courseSection.name,
    homeroomClassId: assessment.courseSection.homeroomClassId,
    teacherId: assessment.teacherId,
    teacherFullName: assessment.teacher.fullName,
    type: assessment.type,
    name: assessment.name,
    assessmentDate: toIsoDateString(assessment.assessmentDate),
    maxScore: assessment.maxScore.toNumber(),
    weight: decimalToNumber(assessment.weight),
    status: assessment.status,
    note: assessment.note,
    scoreCount: assessment._count?.scores ?? assessment.scores?.length ?? 0,
    scoredCount,
    createdAt: assessment.createdAt.toISOString(),
    updatedAt: assessment.updatedAt.toISOString(),
  };
}

export function toAssessmentDetailResponse(
  assessment: AssessmentWithRelations,
): AssessmentDetailResponse {
  const scores = assessment.scores ?? [];
  const scoredCount = scores.filter((row) => row.score != null).length;

  return {
    ...toAssessmentResponse(assessment, scoredCount),
    scores: scores.map(toScoreSummary),
  };
}
