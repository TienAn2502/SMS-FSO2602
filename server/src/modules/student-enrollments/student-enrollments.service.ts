import { HttpStatus, Injectable } from '@nestjs/common';

import { EnrollmentStatus, Prisma, SummaryStatus } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';

import { PrismaService } from '@/common/database/prisma.service';

import {
  parseIsoDate,
  toIsoDateString,
} from '@/common/schemas/academic.schema';

import type { PaginationMeta } from '@/common/types/api-response.types';

import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';

import { HomeroomClassesService } from '@/modules/homeroom-classes/homeroom-classes.service';

import { SemestersService } from '@/modules/semesters/semesters.service';

import { StudentsService } from '@/modules/students/students.service';

import {
  studentEnrollmentInclude,
  toStudentEnrollmentResponse,
  type StudentEnrollmentResponse,
} from '@/modules/student-enrollments/mappers/student-enrollment.mapper';

import type {
  CloseSemesterEnrollmentsInput,
  CopySemesterEnrollmentsInput,
  CreateFromYearPromotionsInput,
  CreateStudentEnrollmentInput,
  FromYearPromotionsPreviewQuery,
  ListStudentEnrollmentsQuery,
  SyncStaleEnrollmentsInput,
  TransferStudentEnrollmentInput,
  WithdrawStudentEnrollmentInput,
} from '@/modules/student-enrollments/schemas/student-enrollment.schema';
import { planYearPromotionEnrollments } from '@/modules/student-enrollments/year-promotion-enrollments.util';

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
      targetHomeroomClass.academicYearId !== enrollment.semester.academicYear.id
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

  async copyFromSemester(
    schoolId: string,
    input: CopySemesterEnrollmentsInput,
  ): Promise<{
    sourceSemesterId: string;
    targetSemesterId: string;
    sourceSemesterCode: string;
    targetSemesterCode: string;
    sourceActiveCount: number;
    createdCount: number;
    skippedCount: number;
    sourceClosedCount: number;
  }> {
    if (input.sourceSemesterId === input.targetSemesterId) {
      throw new AppException(
        'ENROLLMENT_COPY_SAME_SEMESTER',
        'Học kỳ nguồn và học kỳ đích phải khác nhau',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const sourceSemester = await this.semestersService.findSemesterInTenantById(
      schoolId,
      input.sourceSemesterId,
    );
    const targetSemester = await this.semestersService.findSemesterInTenantById(
      schoolId,
      input.targetSemesterId,
    );

    if (sourceSemester.academicYearId !== targetSemester.academicYearId) {
      throw new AppException(
        'TENANT_MISMATCH',
        'Hai học kỳ phải thuộc cùng năm học',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const sourceEnrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId: input.sourceSemesterId,
        status: EnrollmentStatus.ACTIVE,
      },
      select: {
        studentId: true,
        homeroomClassId: true,
        note: true,
        homeroomClass: {
          select: {
            code: true,
          },
        },
      },
      orderBy: { enrolledAt: 'asc' },
    });

    if (sourceEnrollments.length === 0) {
      throw new AppException(
        'NO_SOURCE_ENROLLMENTS',
        'Không có ghi danh đang học (ACTIVE) ở học kỳ nguồn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Lấy danh sách học sinh đã có ghi danh ở học kỳ đích
    const existingTargetStudentIds =
      await this.prisma.studentEnrollment.findMany({
        where: {
          schoolId,
          semesterId: input.targetSemesterId,
          status: EnrollmentStatus.ACTIVE,
          studentId: {
            in: sourceEnrollments.map((enrollment) => enrollment.studentId),
          },
        },
        select: { studentId: true },
      });
    const skipStudentIds = new Set(
      existingTargetStudentIds.map((row) => row.studentId),
    );

    const enrolledAt = input.enrolledAt
      ? parseIsoDate(input.enrolledAt)
      : targetSemester.startDate;

    //  id của những student cần tạo ghi danh ở học kỳ đích
    const toCreate = sourceEnrollments.filter(
      (source) => !skipStudentIds.has(source.studentId),
    );
    const skippedCount = sourceEnrollments.length - toCreate.length;

    let createdCount = 0;

    if (toCreate.length > 0) {
      // Tạo ghi danh cho những student cần tạo
      const result = await this.prisma.studentEnrollment.createMany({
        data: toCreate.map((source) => ({
          schoolId,
          studentId: source.studentId,
          semesterId: input.targetSemesterId,
          homeroomClassId: source.homeroomClassId,
          enrolledAt,
          note:
            input.note ??
            `Ghi danh ${source.homeroomClass.code} ${targetSemester.code}`,
          status: EnrollmentStatus.ACTIVE,
        })),
      });
      createdCount = result.count;
    }

    let sourceClosedCount = 0;

    if (input.closeSourceSemester || !sourceSemester.isCurrent) {
      const closeResult = await this.closeSemesterEnrollments(schoolId, {
        semesterId: input.sourceSemesterId,
        leftAt: toIsoDateString(sourceSemester.endDate),
      });
      sourceClosedCount = closeResult.closedCount;
    }

    return {
      sourceSemesterId: sourceSemester.id,
      targetSemesterId: targetSemester.id,
      sourceSemesterCode: sourceSemester.code,
      targetSemesterCode: targetSemester.code,
      sourceActiveCount: sourceEnrollments.length,
      createdCount,
      skippedCount,
      sourceClosedCount,
    };
  }

  async closeSemesterEnrollments(
    schoolId: string,
    input: CloseSemesterEnrollmentsInput,
  ): Promise<{
    semesterId: string;
    semesterCode: string;
    closedCount: number;
  }> {
    const semester = await this.semestersService.findSemesterInTenantById(
      schoolId,
      input.semesterId,
    );

    if (semester.isCurrent) {
      throw new AppException(
        'ENROLLMENT_SEMESTER_IS_CURRENT',
        'Không thể đóng ghi danh của học kỳ đang hiện hành',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const leftAt = input.leftAt ? parseIsoDate(input.leftAt) : semester.endDate;

    const result = await this.prisma.studentEnrollment.updateMany({
      where: {
        schoolId,
        semesterId: input.semesterId,
        status: EnrollmentStatus.ACTIVE,
      },
      data: {
        status: EnrollmentStatus.SEMESTER_COMPLETED,
        leftAt,
      },
    });

    if (result.count === 0) {
      throw new AppException(
        'NO_ACTIVE_ENROLLMENTS_TO_CLOSE',
        'Không có ghi danh đang học (ACTIVE) để đóng ở học kỳ này',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return {
      semesterId: semester.id,
      semesterCode: semester.code,
      closedCount: result.count,
    };
  }

  async syncStaleEnrollments(
    schoolId: string,
    input: SyncStaleEnrollmentsInput,
  ): Promise<{
    academicYearId: string;
    closedCount: number;
    closedBySemester: Array<{
      semesterId: string;
      semesterCode: string;
      closedCount: number;
    }>;
  }> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: input.academicYearId, schoolId },
      select: { id: true },
    });

    if (!academicYear) {
      throw new AppException(
        'ACADEMIC_YEAR_NOT_FOUND',
        'Không tìm thấy năm học',
        HttpStatus.NOT_FOUND,
      );
    }

    const staleSemesters = await this.prisma.semester.findMany({
      where: {
        schoolId,
        academicYearId: input.academicYearId,
        isCurrent: false,
      },
      select: { id: true, code: true, endDate: true },
      orderBy: { startDate: 'asc' },
    });

    const closedBySemester: Array<{
      semesterId: string;
      semesterCode: string;
      closedCount: number;
    }> = [];
    let closedCount = 0;

    for (const semester of staleSemesters) {
      const result = await this.prisma.studentEnrollment.updateMany({
        where: {
          schoolId,
          semesterId: semester.id,
          status: EnrollmentStatus.ACTIVE,
        },
        data: {
          status: EnrollmentStatus.SEMESTER_COMPLETED,
          leftAt: semester.endDate,
        },
      });

      if (result.count > 0) {
        closedBySemester.push({
          semesterId: semester.id,
          semesterCode: semester.code,
          closedCount: result.count,
        });
        closedCount += result.count;
      }
    }

    if (closedCount === 0) {
      throw new AppException(
        'NO_STALE_ENROLLMENTS',
        'Không có ghi danh ACTIVE ở học kỳ không hiện hành cần đóng',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return {
      academicYearId: input.academicYearId,
      closedCount,
      closedBySemester,
    };
  }

  async previewFromYearPromotions(
    schoolId: string,
    query: FromYearPromotionsPreviewQuery,
  ) {
    const plan = await this.buildFromYearPromotionsPlan(
      schoolId,
      query.sourceAcademicYearId,
      query.targetSemesterId,
      false,
    );

    return {
      sourceAcademicYearId: plan.sourceAcademicYearId,
      sourceAcademicYearName: plan.sourceAcademicYearName,
      targetSemesterId: plan.targetSemesterId,
      targetSemesterCode: plan.targetSemesterCode,
      targetAcademicYearId: plan.targetAcademicYearId,
      eligibleCount: plan.eligibleCount,
      wouldCreateCount: plan.toCreate.length,
      skippedExistingCount: plan.skippedExistingCount,
      missingNextClassCount: plan.missingNextClassCount,
      invalidNextClassCount: plan.invalidNextClassCount,
      graduatedSkippedCount: plan.graduatedSkippedCount,
      retainedSkippedCount: plan.retainedSkippedCount,
    };
  }

  async createFromYearPromotions(
    schoolId: string,
    input: CreateFromYearPromotionsInput,
  ) {
    const plan = await this.buildFromYearPromotionsPlan(
      schoolId,
      input.sourceAcademicYearId,
      input.targetSemesterId,
      true,
    );

    const enrolledAt = input.enrolledAt
      ? parseIsoDate(input.enrolledAt)
      : plan.targetSemesterStartDate;

    let createdCount = 0;

    if (plan.toCreate.length > 0) {
      const result = await this.prisma.studentEnrollment.createMany({
        data: plan.toCreate.map((row) => ({
          schoolId,
          studentId: row.studentId,
          semesterId: plan.targetSemesterId,
          homeroomClassId: row.homeroomClassId,
          enrolledAt,
          note:
            input.note ??
            `Ghi danh từ xét lên lớp ${plan.sourceAcademicYearName}`,
          status: EnrollmentStatus.ACTIVE,
        })),
      });
      createdCount = result.count;
    }

    return {
      sourceAcademicYearId: plan.sourceAcademicYearId,
      sourceAcademicYearName: plan.sourceAcademicYearName,
      targetSemesterId: plan.targetSemesterId,
      targetSemesterCode: plan.targetSemesterCode,
      targetAcademicYearId: plan.targetAcademicYearId,
      eligibleCount: plan.eligibleCount,
      createdCount,
      skippedExistingCount: plan.skippedExistingCount,
      missingNextClassCount: plan.missingNextClassCount,
      invalidNextClassCount: plan.invalidNextClassCount,
      graduatedSkippedCount: plan.graduatedSkippedCount,
      retainedSkippedCount: plan.retainedSkippedCount,
    };
  }

  private async buildFromYearPromotionsPlan(
    schoolId: string,
    sourceAcademicYearId: string,
    targetSemesterId: string,
    requireEligibleSummaries: boolean,
  ) {
    const sourceYear = await this.prisma.academicYear.findFirst({
      where: { id: sourceAcademicYearId, schoolId },
      select: { id: true, name: true },
    });

    if (!sourceYear) {
      throw new AppException(
        'ACADEMIC_YEAR_NOT_FOUND',
        'Không tìm thấy năm học nguồn',
        HttpStatus.NOT_FOUND,
      );
    }

    const targetSemester =
      await this.semestersService.findSemesterInTenantById(
        schoolId,
        targetSemesterId,
      );

    if (targetSemester.academicYearId === sourceAcademicYearId) {
      throw new AppException(
        'YEAR_PROMOTION_SAME_YEAR',
        'Học kỳ đích phải thuộc năm học khác với năm nguồn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const summaries = await this.prisma.studentYearSummary.findMany({
      where: {
        schoolId,
        academicYearId: sourceAcademicYearId,
        status: SummaryStatus.CLOSED,
        promotionDecision: {
          in: [
            'PROMOTED',
            'RETAINED',
            'GRADUATED',
          ],
        },
      },
      select: {
        studentId: true,
        promotionDecision: true,
        nextHomeroomClassId: true,
        nextHomeroomClass: {
          select: { academicYearId: true },
        },
      },
    });

    const eligibleSummaries = summaries.filter(
      (row) => row.promotionDecision === 'PROMOTED',
    );

    if (requireEligibleSummaries && eligibleSummaries.length === 0) {
      throw new AppException(
        'NO_YEAR_PROMOTION_SUMMARIES',
        'Không có tổng kết năm đã chốt với quyết định lên lớp',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const studentIds = eligibleSummaries.map((row) => row.studentId);
    const existingActive =
      studentIds.length === 0
        ? []
        : await this.prisma.studentEnrollment.findMany({
            where: {
              schoolId,
              semesterId: targetSemesterId,
              status: EnrollmentStatus.ACTIVE,
              studentId: { in: studentIds },
            },
            select: { studentId: true },
          });

    const plan = planYearPromotionEnrollments(
      summaries.map((row) => ({
        studentId: row.studentId,
        promotionDecision: row.promotionDecision,
        nextHomeroomClassId: row.nextHomeroomClassId,
        nextHomeroomAcademicYearId:
          row.nextHomeroomClass?.academicYearId ?? null,
      })),
      targetSemester.academicYearId,
      new Set(existingActive.map((row) => row.studentId)),
    );

    return {
      sourceAcademicYearId: sourceYear.id,
      sourceAcademicYearName: sourceYear.name,
      targetSemesterId: targetSemester.id,
      targetSemesterCode: targetSemester.code,
      targetAcademicYearId: targetSemester.academicYearId,
      targetSemesterStartDate: targetSemester.startDate,
      ...plan,
    };
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
