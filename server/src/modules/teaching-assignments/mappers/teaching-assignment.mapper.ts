import type {
  CourseSection,
  Semester,
  Teacher,
  TeachingAssignment,
} from '@prisma/client';

import { toIsoDateString } from '@/common/schemas/academic.schema';

type TeachingAssignmentWithRelations = TeachingAssignment & {
  teacher: Pick<Teacher, 'id' | 'fullName'>;
  courseSection: Pick<CourseSection, 'id' | 'code' | 'name' | 'semesterId'> & {
    semester: Pick<Semester, 'id' | 'code' | 'name' | 'academicYearId'>;
  };
};

export interface TeachingAssignmentResponse {
  id: string;
  teacherId: string;
  teacherFullName: string;
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  semesterId: string;
  semesterName: string;
  semesterCode: string;
  academicYearId: string;
  assignAt: string;
  endAt: string | null;
  status: TeachingAssignment['status'];
}

export const teachingAssignmentInclude = {
  teacher: {
    select: { id: true, fullName: true },
  },
  courseSection: {
    select: {
      id: true,
      code: true,
      name: true,
      semesterId: true,
      semester: {
        select: { id: true, code: true, name: true, academicYearId: true },
      },
    },
  },
} as const;

export function toTeachingAssignmentResponse(
  assignment: TeachingAssignmentWithRelations,
): TeachingAssignmentResponse {
  return {
    id: assignment.id,
    teacherId: assignment.teacherId,
    teacherFullName: assignment.teacher.fullName,
    courseSectionId: assignment.courseSectionId,
    courseSectionCode: assignment.courseSection.code,
    courseSectionName: assignment.courseSection.name,
    semesterId: assignment.courseSection.semesterId,
    semesterName: assignment.courseSection.semester.name,
    semesterCode: assignment.courseSection.semester.code,
    academicYearId: assignment.courseSection.semester.academicYearId,
    assignAt: toIsoDateString(assignment.assignAt),
    endAt: assignment.endAt ? toIsoDateString(assignment.endAt) : null,
    status: assignment.status,
  };
}
