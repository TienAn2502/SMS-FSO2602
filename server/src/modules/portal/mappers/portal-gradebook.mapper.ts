import type {
  Assessment,
  AssessmentStatus,
  AssessmentType,
  CourseSection,
  Score,
} from '@prisma/client';

type PortalMyScoreRow = Score & {
  assessment: Assessment & {
    courseSection: Pick<CourseSection, 'id' | 'code' | 'name'> & {
      gradeLevelSubject?: {
        subject: { id: string; code: string; name: string };
      } | null;
    };
    teacher: { fullName: string };
  };
};

export interface PortalMyScoreItem {
  id: string;
  score: number | null;
  note: string | null;
  assessmentId: string;
  assessmentName: string;
  assessmentType: AssessmentType;
  assessmentDate: string;
  maxScore: number;
  assessmentStatus: Assessment['status'];
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  subjectId: string | null;
  subjectCode: string | null;
  subjectName: string | null;
  teacherFullName: string;
}

export function toPortalMyScoreItem(row: PortalMyScoreRow): PortalMyScoreItem {
  const subject = row.assessment.courseSection.gradeLevelSubject?.subject;

  return {
    id: row.id,
    score: row.score?.toNumber() ?? null,
    note: row.note,
    assessmentId: row.assessmentId,
    assessmentName: row.assessment.name,
    assessmentType: row.assessment.type,
    assessmentDate: row.assessment.assessmentDate.toISOString().slice(0, 10),
    maxScore: row.assessment.maxScore.toNumber(),
    assessmentStatus: row.assessment.status,
    courseSectionId: row.assessment.courseSectionId,
    courseSectionCode: row.assessment.courseSection.code,
    courseSectionName: row.assessment.courseSection.name,
    subjectId: subject?.id ?? null,
    subjectCode: subject?.code ?? null,
    subjectName: subject?.name ?? null,
    teacherFullName: row.assessment.teacher.fullName,
  };
}

export interface PortalGradebookClassSummary {
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  semesterId: string;
  semesterCode: string;
  semesterName: string;
  homeroomClassCode: string | null;
  subjectCode: string | null;
  subjectName: string | null;
}

export type GradebookGridSlotKey = string;

export interface PortalGradebookGridColumn {
  slotKey: GradebookGridSlotKey;
  assessmentId: string;
  type: AssessmentType;
  name: string;
  assessmentDate: string | null;
  maxScore: number;
  status: AssessmentStatus;
  editable: boolean;
}

export interface PortalGradebookGridCell {
  scoreId: string;
  score: number | null;
  note: string | null;
  absent: boolean;
  editable: boolean;
}

export interface PortalGradebookGridRow {
  studentId: string;
  studentFullName: string;
  cells: Record<GradebookGridSlotKey, PortalGradebookGridCell | undefined>;
  semesterAverage: number | null;
}

export interface PortalGradebookGrid {
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  semesterId: string;
  semesterName: string;
  semesterIsCurrent: boolean;
  academicYearId: string;
  academicYearName: string;
  homeroomClassCode: string | null;
  subjectCode: string | null;
  subjectName: string | null;
  periodsPerYear: number | null;
  regularTxPerYear: number;
  regularSlotsThisSemester: number;
  isLocked: boolean;
  columns: PortalGradebookGridColumn[];
  rows: PortalGradebookGridRow[];
}

export interface PortalStudentScoresGridColumn {
  slotKey: string;
  label: string;
  type: AssessmentType;
}

export interface PortalStudentScoresGridCell {
  score: number | null;
  note: string | null;
  absent: boolean;
}

export interface PortalStudentScoresGridRow {
  courseSectionId: string;
  subjectCode: string | null;
  subjectName: string | null;
  teacherFullName: string | null;
  cells: Record<string, PortalStudentScoresGridCell | undefined>;
  semesterAverage: number | null;
}

export interface PortalStudentScoresGrid {
  semesterId: string;
  semesterName: string;
  academicYearId: string;
  academicYearName: string;
  homeroomClassCode: string | null;
  columns: PortalStudentScoresGridColumn[];
  rows: PortalStudentScoresGridRow[];
}

type GradebookClassAssignmentRow = {
  courseSectionId: string;
  courseSection: {
    id: string;
    code: string;
    name: string;
    semesterId: string;
    semester: { name: string; code: string };
    homeroomClass: { code: string } | null;
    gradeLevelSubject: {
      subject: { code: string; name: string };
    };
  };
};

export function toPortalGradebookClassSummary(
  assignment: GradebookClassAssignmentRow,
): PortalGradebookClassSummary {
  const subject = assignment.courseSection.gradeLevelSubject.subject;

  return {
    courseSectionId: assignment.courseSection.id,
    courseSectionCode: assignment.courseSection.code,
    courseSectionName: assignment.courseSection.name,
    semesterId: assignment.courseSection.semesterId,
    semesterCode: assignment.courseSection.semester.code,
    semesterName: assignment.courseSection.semester.name,
    homeroomClassCode: assignment.courseSection.homeroomClass?.code ?? null,
    subjectCode: subject.code,
    subjectName: subject.name,
  };
}
