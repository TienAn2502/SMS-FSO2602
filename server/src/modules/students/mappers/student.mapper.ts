import type {
  AcademicYear,
  EnrollmentStatus,
  Gender,
  HomeroomClass,
  Semester,
  Student,
  StudentEnrollment,
  User,
} from '@prisma/client';

import { toIsoDateString } from '@/common/schemas/academic.schema';
import { STUDENT_YEAR_ENROLLMENT_STATUSES } from '@/common/utils/enrollment-status.util';

type StudentEnrollmentWithRelations = StudentEnrollment & {
  homeroomClass: Pick<HomeroomClass, 'id' | 'name' | 'code'>;

  semester: Pick<Semester, 'id' | 'name' | 'code' | 'isCurrent'> & {
    academicYear: Pick<AcademicYear, 'id' | 'name' | 'code' | 'isCurrent'>;
  };
};

export interface StudentEnrollmentSummary {
  id: string;

  semesterId: string;

  semesterName: string;

  academicYearId: string;

  academicYearName: string;

  homeroomClassId: string;

  homeroomClassName: string;

  homeroomClassCode: string;

  enrolledAt: string;

  status: EnrollmentStatus;
}

export interface StudentResponse {
  id: string;

  userId: string | null;

  userEmail: string | null;

  fullName: string;

  dateOfBirth: string | null;

  gender: Gender | null;

  phone: string | null;

  address: string | null;

  externalCode: string | null;

  avatarFileId: string | null;

  status: Student['status'];

  currentEnrollment: StudentEnrollmentSummary | null;

  createdAt: string;

  updatedAt: string;
}

type StudentWithRelations = Student & {
  user: Pick<User, 'email'> | null;

  enrollments: StudentEnrollmentWithRelations[];
};

export function pickCurrentEnrollment(
  enrollments: StudentEnrollmentWithRelations[],
): StudentEnrollmentWithRelations | null {
  const eligible = enrollments.filter((enrollment) =>
    STUDENT_YEAR_ENROLLMENT_STATUSES.includes(enrollment.status),
  );

  if (eligible.length === 0) {
    return null;
  }

  const activeCurrentSemester = eligible.find(
    (enrollment) =>
      enrollment.status === 'ACTIVE' && enrollment.semester.isCurrent,
  );

  if (activeCurrentSemester) {
    return activeCurrentSemester;
  }

  const activeCurrentYear = eligible.find(
    (enrollment) =>
      enrollment.status === 'ACTIVE' &&
      enrollment.semester.academicYear.isCurrent,
  );

  if (activeCurrentYear) {
    return activeCurrentYear;
  }

  const anyActive = eligible.find(
    (enrollment) => enrollment.status === 'ACTIVE',
  );

  if (anyActive) {
    return anyActive;
  }

  return null;
}

export function toEnrollmentSummary(
  enrollment: StudentEnrollmentWithRelations,
): StudentEnrollmentSummary {
  return {
    id: enrollment.id,

    semesterId: enrollment.semesterId,

    semesterName: enrollment.semester.name,

    academicYearId: enrollment.semester.academicYear.id,

    academicYearName: enrollment.semester.academicYear.name,

    homeroomClassId: enrollment.homeroomClassId,

    homeroomClassName: enrollment.homeroomClass.name,

    homeroomClassCode: enrollment.homeroomClass.code,

    enrolledAt: toIsoDateString(enrollment.enrolledAt),

    status: enrollment.status,
  };
}

export function toStudentResponse(
  student: StudentWithRelations,
): StudentResponse {
  const currentEnrollment = pickCurrentEnrollment(student.enrollments);

  return {
    id: student.id,

    userId: student.userId,

    userEmail: student.user?.email ?? null,

    fullName: student.fullName,

    dateOfBirth: student.dateOfBirth
      ? toIsoDateString(student.dateOfBirth)
      : null,

    gender: student.gender,

    phone: student.phone,

    address: student.address,

    externalCode: student.externalCode,

    avatarFileId: student.avatarFileId,

    status: student.status,

    currentEnrollment: currentEnrollment
      ? toEnrollmentSummary(currentEnrollment)
      : null,

    createdAt: student.createdAt.toISOString(),

    updatedAt: student.updatedAt.toISOString(),
  };
}

export const studentInclude = {
  user: {
    select: { email: true },
  },

  enrollments: {
    where: {
      status: { in: STUDENT_YEAR_ENROLLMENT_STATUSES },
    },

    include: {
      homeroomClass: {
        select: { id: true, name: true, code: true },
      },

      semester: {
        select: {
          id: true,

          name: true,

          code: true,

          isCurrent: true,

          academicYear: {
            select: { id: true, name: true, code: true, isCurrent: true },
          },
        },
      },
    },

    orderBy: { enrolledAt: 'desc' as const },
  },
} as const;
