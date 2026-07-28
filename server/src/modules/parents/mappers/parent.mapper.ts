import type { Parent, Student, StudentParent, User } from '@prisma/client';

import { toIsoDateString } from '../../../common/schemas/academic.schema';

export interface LinkedStudentSummary {
  id: string;
  studentId: string;
  studentFullName: string;
  relationship: StudentParent['relationship'];
  isPrimaryContact: boolean;
}

export interface ParentResponse {
  id: string;
  userId: string | null;
  userEmail: string | null;
  fullName: string;
  phone: string | null;
  status: Parent['status'];
  linkedStudents: LinkedStudentSummary[];
}

type StudentParentWithStudent = StudentParent & {
  student: Pick<Student, 'id' | 'fullName'>;
};

type ParentWithRelations = Parent & {
  user: Pick<User, 'email'> | null;
  studentParents: StudentParentWithStudent[];
};

export function toLinkedStudentSummary(
  link: StudentParentWithStudent,
): LinkedStudentSummary {
  return {
    id: link.id,
    studentId: link.studentId,
    studentFullName: link.student.fullName,
    relationship: link.relationship,
    isPrimaryContact: link.isPrimaryContact,
  };
}

export function toParentResponse(parent: ParentWithRelations): ParentResponse {
  return {
    id: parent.id,
    userId: parent.userId,
    userEmail: parent.user?.email ?? null,
    fullName: parent.fullName,
    phone: parent.phone,
    status: parent.status,
    linkedStudents: parent.studentParents.map(toLinkedStudentSummary),
  };
}

export function toParentListResponse(
  parent: Parent & { user: Pick<User, 'email'> | null },
): ParentResponse {
  return {
    id: parent.id,
    userId: parent.userId,
    userEmail: parent.user?.email ?? null,
    fullName: parent.fullName,
    phone: parent.phone,
    status: parent.status,
    linkedStudents: [],
  };
}

export const parentInclude = {
  user: {
    select: { email: true },
  },
  studentParents: {
    include: {
      student: {
        select: { id: true, fullName: true },
      },
    },
    orderBy: { student: { fullName: 'asc' as const } },
  },
} as const;

export const parentListInclude = {
  user: {
    select: { email: true },
  },
} as const;
