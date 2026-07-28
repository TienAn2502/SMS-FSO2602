import type {

  AcademicYear,

  EnrollmentStatus,

  HomeroomClass,

  Semester,

  Student,

  StudentEnrollment,

} from '@prisma/client';



import { toIsoDateString } from '../../../common/schemas/academic.schema';



type StudentEnrollmentWithRelations = StudentEnrollment & {

  student: Pick<Student, 'id' | 'fullName'>;

  homeroomClass: Pick<HomeroomClass, 'id' | 'name' | 'code'>;

  semester: Pick<Semester, 'id' | 'name' | 'code' | 'isCurrent'> & {

    academicYear: Pick<AcademicYear, 'id' | 'name' | 'code' | 'isCurrent'>;

  };

};



export interface StudentEnrollmentResponse {

  id: string;

  studentId: string;

  studentFullName: string;

  semesterId: string;

  semesterName: string;

  semesterCode: string;

  academicYearId: string;

  academicYearName: string;

  academicYearCode: string;

  homeroomClassId: string;

  homeroomClassName: string;

  homeroomClassCode: string;

  enrolledAt: string;

  leftAt: string | null;

  status: EnrollmentStatus;

  note: string | null;

  createdAt: string;

  updatedAt: string;

}



export const studentEnrollmentInclude = {

  student: {

    select: { id: true, fullName: true },

  },

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

} as const;



export function toStudentEnrollmentResponse(

  enrollment: StudentEnrollmentWithRelations,

): StudentEnrollmentResponse {

  return {

    id: enrollment.id,

    studentId: enrollment.studentId,

    studentFullName: enrollment.student.fullName,

    semesterId: enrollment.semesterId,

    semesterName: enrollment.semester.name,

    semesterCode: enrollment.semester.code,

    academicYearId: enrollment.semester.academicYear.id,

    academicYearName: enrollment.semester.academicYear.name,

    academicYearCode: enrollment.semester.academicYear.code,

    homeroomClassId: enrollment.homeroomClassId,

    homeroomClassName: enrollment.homeroomClass.name,

    homeroomClassCode: enrollment.homeroomClass.code,

    enrolledAt: toIsoDateString(enrollment.enrolledAt),

    leftAt: enrollment.leftAt ? toIsoDateString(enrollment.leftAt) : null,

    status: enrollment.status,

    note: enrollment.note,

    createdAt: enrollment.createdAt.toISOString(),

    updatedAt: enrollment.updatedAt.toISOString(),

  };

}

