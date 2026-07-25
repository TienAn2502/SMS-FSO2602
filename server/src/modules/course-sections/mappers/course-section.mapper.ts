import type { CourseSection } from '@prisma/client';

export interface CourseSectionResponse {
  id: string;
  academicYearId: string;
  homeroomClassId: string | null;
  gradeLevelSubjectId: string;
  name: string;
  code: string;
  status: CourseSection['status'];
  createdAt: string;
  updatedAt: string;
}

export function toCourseSectionResponse(
  courseSection: CourseSection,
): CourseSectionResponse {
  return {
    id: courseSection.id,
    academicYearId: courseSection.academicYearId,
    homeroomClassId: courseSection.homeroomClassId,
    gradeLevelSubjectId: courseSection.gradeLevelSubjectId,
    name: courseSection.name,
    code: courseSection.code,
    status: courseSection.status,
    createdAt: courseSection.createdAt.toISOString(),
    updatedAt: courseSection.updatedAt.toISOString(),
  };
}
