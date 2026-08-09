import type {
  CourseSection,
  Teacher,
  TeachingAssignment,
  User,
} from '@prisma/client';

import { toIsoDateString } from '@/common/schemas/academic.schema';

export interface TeachingAssignmentSummary {
  id: string;
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  assignAt: string;
  endAt: string | null;
  status: TeachingAssignment['status'];
}

export interface TeacherResponse {
  id: string;
  userId: string | null;
  userEmail: string | null;
  fullName: string;
  dateOfBirth: string | null;
  gender: Teacher['gender'];
  phone: string | null;
  address: string | null;
  specialization: string | null;
  avatarFileId: string | null;
  status: Teacher['status'];
  teachingAssignments: TeachingAssignmentSummary[];
}

type TeachingAssignmentWithSection = TeachingAssignment & {
  courseSection: Pick<CourseSection, 'id' | 'code' | 'name'>;
};

type TeacherWithRelations = Teacher & {
  user: Pick<User, 'email'> | null;
  teachingAssignments: TeachingAssignmentWithSection[];
};

export function toTeachingAssignmentSummary(
  assignment: TeachingAssignmentWithSection,
): TeachingAssignmentSummary {
  return {
    id: assignment.id,
    courseSectionId: assignment.courseSectionId,
    courseSectionCode: assignment.courseSection.code,
    courseSectionName: assignment.courseSection.name,
    assignAt: toIsoDateString(assignment.assignAt),
    endAt: assignment.endAt ? toIsoDateString(assignment.endAt) : null,
    status: assignment.status,
  };
}

export function toTeacherResponse(
  teacher: TeacherWithRelations,
): TeacherResponse {
  return {
    id: teacher.id,
    userId: teacher.userId,
    userEmail: teacher.user?.email ?? null,
    fullName: teacher.fullName,
    dateOfBirth: teacher.dateOfBirth
      ? toIsoDateString(teacher.dateOfBirth)
      : null,
    gender: teacher.gender,
    phone: teacher.phone,
    address: teacher.address,
    specialization: teacher.specialization,
    avatarFileId: teacher.avatarFileId,
    status: teacher.status,
    teachingAssignments: teacher.teachingAssignments.map(
      toTeachingAssignmentSummary,
    ),
  };
}

export const teacherInclude = {
  user: {
    select: { email: true },
  },
  teachingAssignments: {
    where: { status: 'ACTIVE' as const },
    include: {
      courseSection: {
        select: { id: true, code: true, name: true },
      },
    },
    orderBy: { assignAt: 'desc' as const },
  },
} as const;

export function toTeacherListResponse(
  teacher: Teacher & { user: Pick<User, 'email'> | null },
): TeacherResponse {
  return {
    id: teacher.id,
    userId: teacher.userId,
    userEmail: teacher.user?.email ?? null,
    fullName: teacher.fullName,
    dateOfBirth: teacher.dateOfBirth
      ? toIsoDateString(teacher.dateOfBirth)
      : null,
    gender: teacher.gender,
    phone: teacher.phone,
    address: teacher.address,
    specialization: teacher.specialization,
    avatarFileId: teacher.avatarFileId,
    status: teacher.status,
    teachingAssignments: [],
  };
}

export const teacherListInclude = {
  user: {
    select: { email: true },
  },
} as const;
