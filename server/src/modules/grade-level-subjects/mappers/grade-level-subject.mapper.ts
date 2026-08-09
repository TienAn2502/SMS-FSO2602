import type { GradeLevelSubject } from '@prisma/client';

type GradeLevelSubjectWithRelations = GradeLevelSubject & {
  gradeLevel: { id: string; code: string; name: string };
  subject: { id: string; code: string; name: string; status: GradeLevelSubject['status'] };
};

export interface GradeLevelSubjectResponse {
  id: string;
  gradeLevelId: string;
  gradeLevelCode: string;
  gradeLevelName: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  isRequired: boolean;
  periodsPerYear: number | null;
  evaluationMode: GradeLevelSubject['evaluationMode'];
  status: GradeLevelSubject['status'];
}

export function toGradeLevelSubjectResponse(
  record: GradeLevelSubjectWithRelations,
): GradeLevelSubjectResponse {
  return {
    id: record.id,
    gradeLevelId: record.gradeLevelId,
    gradeLevelCode: record.gradeLevel.code,
    gradeLevelName: record.gradeLevel.name,
    subjectId: record.subjectId,
    subjectCode: record.subject.code,
    subjectName: record.subject.name,
    isRequired: record.isRequired,
    periodsPerYear: record.periodsPerYear,
    evaluationMode: record.evaluationMode,
    status: record.status,
  };
}
