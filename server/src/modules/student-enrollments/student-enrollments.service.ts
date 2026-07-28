import { HttpStatus, Injectable } from '@nestjs/common';

import { EnrollmentStatus, Prisma } from '@prisma/client';



import { AppException } from '../../common/exceptions/app.exception';

import { PrismaService } from '../../common/database/prisma.service';

import { parseIsoDate } from '../../common/schemas/academic.schema';

import type { PaginationMeta } from '../../common/types/api-response.types';

import {

  buildPaginationMeta,

  getSkip,

} from '../../common/utils/pagination.util';

import { HomeroomClassesService } from '../homeroom-classes/homeroom-classes.service';

import { SemestersService } from '../semesters/semesters.service';

import { StudentsService } from '../students/students.service';

import {

  studentEnrollmentInclude,

  toStudentEnrollmentResponse,

  type StudentEnrollmentResponse,

} from './mappers/student-enrollment.mapper';

import type {

  CreateStudentEnrollmentInput,

  ListStudentEnrollmentsQuery,

  TransferStudentEnrollmentInput,

  WithdrawStudentEnrollmentInput,

} from './schemas/student-enrollment.schema';



@Injectable()

export class StudentEnrollmentsService {

  constructor(

    private readonly prisma: PrismaService,

    private readonly studentsService: StudentsService,

    private readonly semestersService: SemestersService,

    private readonly homeroomClassesService: HomeroomClassesService,

  ) {}



  async list(

    schoolId: string,

    query: ListStudentEnrollmentsQuery,

  ): Promise<{ items: StudentEnrollmentResponse[]; meta: PaginationMeta }> {

    const where: Prisma.StudentEnrollmentWhereInput = {

      schoolId,

      ...(query.studentId ? { studentId: query.studentId } : {}),

      ...(query.semesterId ? { semesterId: query.semesterId } : {}),

      ...(query.homeroomClassId

        ? { homeroomClassId: query.homeroomClassId }

        : {}),

      ...(query.status ? { status: query.status } : {}),

      ...(query.academicYearId

        ? {

            semester: {

              academicYearId: query.academicYearId,

            },

          }

        : {}),

    };



    const orderBy: Prisma.StudentEnrollmentOrderByWithRelationInput = {

      [query.sortBy]: query.sortOrder,

    };



    const [total, enrollments] = await this.prisma.$transaction([

      this.prisma.studentEnrollment.count({ where }),

      this.prisma.studentEnrollment.findMany({

        where,

        orderBy,

        skip: getSkip(query.page, query.limit),

        take: query.limit,

        include: studentEnrollmentInclude,

      }),

    ]);



    return {

      items: enrollments.map(toStudentEnrollmentResponse),

      meta: buildPaginationMeta(query.page, query.limit, total),

    };

  }



  async listByStudent(

    schoolId: string,

    studentId: string,

    query: ListStudentEnrollmentsQuery,

  ): Promise<{ items: StudentEnrollmentResponse[]; meta: PaginationMeta }> {

    await this.studentsService.findStudentInTenant(schoolId, studentId);



    return this.list(schoolId, {

      ...query,

      studentId,

    });

  }



  async findById(

    schoolId: string,

    enrollmentId: string,

  ): Promise<StudentEnrollmentResponse> {

    const enrollment = await this.findEnrollmentInTenant(

      schoolId,

      enrollmentId,

    );

    return toStudentEnrollmentResponse(enrollment);

  }



  async create(

    schoolId: string,

    input: CreateStudentEnrollmentInput,

  ): Promise<StudentEnrollmentResponse> {

    await this.studentsService.findStudentInTenant(schoolId, input.studentId);



    const semester = await this.semestersService.findSemesterInTenantById(

      schoolId,

      input.semesterId,

    );



    const homeroomClass =

      await this.homeroomClassesService.findHomeroomClassInTenant(

        schoolId,

        input.homeroomClassId,

      );



    if (homeroomClass.academicYearId !== semester.academicYearId) {

      throw new AppException(

        'TENANT_MISMATCH',

        'Lớp hành chính không thuộc năm học của học kỳ đã chọn',

        HttpStatus.UNPROCESSABLE_ENTITY,

      );

    }



    const existingActive = await this.prisma.studentEnrollment.findFirst({

      where: {

        schoolId,

        studentId: input.studentId,

        semesterId: input.semesterId,

        status: EnrollmentStatus.ACTIVE,

      },

    });



    if (existingActive) {

      throw new AppException(

        'ENROLLMENT_ALREADY_ACTIVE',

        'Học sinh đã có lớp hành chính đang học trong học kỳ này',

        HttpStatus.CONFLICT,

      );

    }



    try {

      const enrollment = await this.prisma.studentEnrollment.create({

        data: {

          schoolId,

          studentId: input.studentId,

          semesterId: input.semesterId,

          homeroomClassId: input.homeroomClassId,

          enrolledAt: parseIsoDate(input.enrolledAt),

          note: input.note ?? null,

          status: EnrollmentStatus.ACTIVE,

        },

        include: studentEnrollmentInclude,

      });



      return toStudentEnrollmentResponse(enrollment);

    } catch (error: unknown) {

      this.handleActiveEnrollmentViolation(error);

      throw error;

    }

  }



  async transfer(

    schoolId: string,

    enrollmentId: string,

    input: TransferStudentEnrollmentInput,

  ): Promise<StudentEnrollmentResponse> {

    const enrollment = await this.findEnrollmentInTenant(

      schoolId,

      enrollmentId,

    );



    if (enrollment.status !== EnrollmentStatus.ACTIVE) {

      throw new AppException(

        'ENROLLMENT_NOT_ACTIVE',

        'Chỉ có thể chuyển lớp khi ghi danh đang ACTIVE',

        HttpStatus.UNPROCESSABLE_ENTITY,

      );

    }



    if (enrollment.homeroomClassId === input.targetHomeroomClassId) {

      throw new AppException(

        'TENANT_MISMATCH',

        'Học sinh đã ở lớp hành chính này',

        HttpStatus.UNPROCESSABLE_ENTITY,

      );

    }



    const targetHomeroomClass =

      await this.homeroomClassesService.findHomeroomClassInTenant(

        schoolId,

        input.targetHomeroomClassId,

      );



    if (

      targetHomeroomClass.academicYearId !==

      enrollment.semester.academicYear.id

    ) {

      throw new AppException(

        'TENANT_MISMATCH',

        'Lớp đích phải thuộc cùng năm học với học kỳ ghi danh',

        HttpStatus.UNPROCESSABLE_ENTITY,

      );

    }



    const transferredAt = parseIsoDate(input.transferredAt);



    try {

      const newEnrollment = await this.prisma.$transaction(async (tx) => {

        await tx.studentEnrollment.update({

          where: { id: enrollmentId },

          data: {

            status: EnrollmentStatus.TRANSFERRED,

            leftAt: transferredAt,

            note: input.note ?? enrollment.note,

          },

        });



        return tx.studentEnrollment.create({

          data: {

            schoolId,

            studentId: enrollment.studentId,

            semesterId: enrollment.semesterId,

            homeroomClassId: input.targetHomeroomClassId,

            enrolledAt: transferredAt,

            note: input.note ?? null,

            status: EnrollmentStatus.ACTIVE,

          },

          include: studentEnrollmentInclude,

        });

      });



      return toStudentEnrollmentResponse(newEnrollment);

    } catch (error: unknown) {

      this.handleActiveEnrollmentViolation(error);

      throw error;

    }

  }



  async withdraw(

    schoolId: string,

    enrollmentId: string,

    input: WithdrawStudentEnrollmentInput,

  ): Promise<StudentEnrollmentResponse> {

    const enrollment = await this.findEnrollmentInTenant(

      schoolId,

      enrollmentId,

    );



    if (enrollment.status !== EnrollmentStatus.ACTIVE) {

      throw new AppException(

        'ENROLLMENT_NOT_ACTIVE',

        'Chỉ có thể rút khỏi lớp khi ghi danh đang ACTIVE',

        HttpStatus.UNPROCESSABLE_ENTITY,

      );

    }



    const leftAt = input.leftAt

      ? parseIsoDate(input.leftAt)

      : new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);



    const updated = await this.prisma.studentEnrollment.update({

      where: { id: enrollmentId },

      data: {

        status: EnrollmentStatus.WITHDRAWN,

        leftAt,

        ...(input.note !== undefined ? { note: input.note } : {}),

      },

      include: studentEnrollmentInclude,

    });



    return toStudentEnrollmentResponse(updated);

  }



  private async findEnrollmentInTenant(schoolId: string, enrollmentId: string) {

    const enrollment = await this.prisma.studentEnrollment.findFirst({

      where: { id: enrollmentId, schoolId },

      include: studentEnrollmentInclude,

    });



    if (!enrollment) {

      throw new AppException(

        'ENROLLMENT_NOT_FOUND',

        'Không tìm thấy ghi danh',

        HttpStatus.NOT_FOUND,

      );

    }



    return enrollment;

  }



  private handleActiveEnrollmentViolation(error: unknown): void {

    if (

      error instanceof Prisma.PrismaClientKnownRequestError &&

      error.code === 'P2002'

    ) {

      throw new AppException(

        'ENROLLMENT_ALREADY_ACTIVE',

        'Học sinh đã có lớp hành chính đang học trong học kỳ này',

        HttpStatus.CONFLICT,

      );

    }

  }

}

