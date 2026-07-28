import type { CourseSection, Semester } from '@prisma/client';

export interface CourseSectionResponse {
  id: string;
  semesterId: string;
  academicYearId: string;
  homeroomClassId: string | null;
  gradeLevelSubjectId: string;
  name: string;
  code: string;
  status: CourseSection['status'];
  createdAt: string;
  updatedAt: string;
}

type CourseSectionWithSemester = CourseSection & {
  semester: Pick<Semester, 'academicYearId'>;
};

export function toCourseSectionResponse(
  courseSection: CourseSectionWithSemester,
): CourseSectionResponse {
  return {
    id: courseSection.id,
    semesterId: courseSection.semesterId,
    academicYearId: courseSection.semester.academicYearId,
    homeroomClassId: courseSection.homeroomClassId,
    gradeLevelSubjectId: courseSection.gradeLevelSubjectId,
    name: courseSection.name,
    code: courseSection.code,
    status: courseSection.status,
    createdAt: courseSection.createdAt.toISOString(),
    updatedAt: courseSection.updatedAt.toISOString(),
  };
}

export const courseSectionInclude = {
  semester: {
    select: { academicYearId: true },
  },
} as const;
