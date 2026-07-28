import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../common/database/prisma.service';
import { parseIsoDate } from '../../common/schemas/academic.schema';
import type { PaginationMeta } from '../../common/types/api-response.types';
import {
  buildPaginationMeta,
  getSkip,
} from '../../common/utils/pagination.util';
import { PasswordService } from '../../common/utils/password.service';
import {
  studentInclude,
  toStudentResponse,
  type StudentResponse,
} from './mappers/student.mapper';
import type {
  CreateStudentInput,
  // CreateStudentUserInput,
  LinkStudentUserInput,
  ListStudentsQuery,
  UpdateStudentInput,
  UpdateStudentStatusInput,
} from './schemas/student.schema';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async list(
    schoolId: string,
    query: ListStudentsQuery,
  ): Promise<{ items: StudentResponse[]; meta: PaginationMeta }> {
    const where: Prisma.StudentWhereInput = {
      schoolId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                fullName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                user: {
                  email: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
      ...(query.homeroomClassId || query.semesterId || query.academicYearId
        ? {
            enrollments: {
              some: {
                status: 'ACTIVE',
                ...(query.homeroomClassId
                  ? { homeroomClassId: query.homeroomClassId }
                  : {}),
                ...(query.semesterId ? { semesterId: query.semesterId } : {}),
                ...(query.academicYearId
                  ? {
                      semester: {
                        academicYearId: query.academicYearId,
                      },
                    }
                  : {}),
              },
            },
          }
        : {}),
    };

    const orderBy: Prisma.StudentOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [total, students] = await this.prisma.$transaction([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
        include: studentInclude,
      }),
    ]);

    return {
      items: students.map(toStudentResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(
    schoolId: string,
    studentId: string,
  ): Promise<StudentResponse> {
    const student = await this.findStudentInTenant(schoolId, studentId);
    return toStudentResponse(student);
  }

  async create(
    schoolId: string,
    input: CreateStudentInput,
  ): Promise<StudentResponse> {
    if (input.account) {
      return this.createWithAccount(schoolId, input);
    }

    const student = await this.prisma.student.create({
      data: this.buildStudentCreateData(schoolId, input),
      include: studentInclude,
    });

    return toStudentResponse(student);
  }

  async update(
    schoolId: string,
    studentId: string,
    input: UpdateStudentInput,
  ): Promise<StudentResponse> {
    await this.findStudentInTenant(schoolId, studentId);

    const student = await this.prisma.student.update({
      where: { id: studentId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.dateOfBirth !== undefined
          ? {
              dateOfBirth: input.dateOfBirth
                ? parseIsoDate(input.dateOfBirth)
                : null,
            }
          : {}),
        ...(input.gender !== undefined ? { gender: input.gender } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
      },
      include: studentInclude,
    });

    if (input.fullName !== undefined && student.userId) {
      await this.prisma.user.update({
        where: { id: student.userId },
        data: { fullName: input.fullName },
      });
    }

    return toStudentResponse(student);
  }

  async updateStatus(
    schoolId: string,
    studentId: string,
    input: UpdateStudentStatusInput,
  ): Promise<StudentResponse> {
    await this.findStudentInTenant(schoolId, studentId);

    const student = await this.prisma.student.update({
      where: { id: studentId },
      data: { status: input.status },
      include: studentInclude,
    });

    return toStudentResponse(student);
  }

  async linkUser(
    schoolId: string,
    studentId: string,
    input: LinkStudentUserInput,
  ): Promise<StudentResponse> {
    const student = await this.findStudentInTenant(schoolId, studentId);

    if (student.userId) {
      throw new AppException(
        'USER_ALREADY_LINKED',
        'Học sinh đã được gắn tài khoản',
        HttpStatus.CONFLICT,
      );
    }

    await this.validateStudentUser(schoolId, input.userId);

    try {
      const updated = await this.prisma.student.update({
        where: { id: studentId },
        data: { userId: input.userId },
        include: studentInclude,
      });

      return toStudentResponse(updated);
    } catch (error: unknown) {
      this.handleUserLinkViolation(error);
      throw error;
    }
  }

  // async createUser(
  //   schoolId: string,
  //   studentId: string,
  //   input: CreateStudentUserInput,
  // ): Promise<StudentResponse> {
  //   const student = await this.findStudentInTenant(schoolId, studentId);

  //   if (student.userId) {
  //     throw new AppException(
  //       'USER_ALREADY_LINKED',
  //       'Học sinh đã được gắn tài khoản',
  //       HttpStatus.CONFLICT,
  //     );
  //   }

  //   const existingEmail = await this.prisma.user.findUnique({
  //     where: { email: input.email },
  //   });

  //   if (existingEmail) {
  //     throw new AppException(
  //       'EMAIL_ALREADY_EXISTS',
  //       'Email đã được sử dụng',
  //       HttpStatus.CONFLICT,
  //     );
  //   }

  //   const passwordHash = await this.passwordService.hash(input.password);

  //   const updated = await this.prisma.$transaction(async (tx) => {
  //     const user = await tx.user.create({
  //       data: {
  //         email: input.email,
  //         passwordHash,
  //         fullName: student.fullName,
  //         role: UserRole.STUDENT,
  //         schoolId,
  //         status: UserStatus.ACTIVE,
  //       },
  //     });

  //     return tx.student.update({
  //       where: { id: studentId },
  //       data: { userId: user.id },
  //       include: studentInclude,
  //     });
  //   });

  //   return toStudentResponse(updated);
  // }

  private async createWithAccount(
    schoolId: string,
    input: CreateStudentInput,
  ): Promise<StudentResponse> {
    const account = input.account;
    if (!account) {
      throw new AppException(
        'VALIDATION_ERROR',
        'Thiếu thông tin tài khoản',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: account.email },
    });

    if (existingEmail) {
      throw new AppException(
        'EMAIL_ALREADY_EXISTS',
        'Email đã được sử dụng',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await this.passwordService.hash(account.password);

    try {
      const student = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: account.email,
            passwordHash,
            fullName: input.fullName,
            role: UserRole.STUDENT,
            schoolId,
            status: UserStatus.ACTIVE,
          },
        });

        return tx.student.create({
          data: {
            schoolId,
            fullName: input.fullName,
            dateOfBirth: input.dateOfBirth
              ? parseIsoDate(input.dateOfBirth)
              : undefined,
            gender: input.gender,
            phone: input.phone,
            address: input.address,
            userId: user.id,
          },
          include: studentInclude,
        });
      });

      return toStudentResponse(student);
    } catch (error: unknown) {
      this.handleUserLinkViolation(error);
      throw error;
    }
  }

  private buildStudentCreateData(
    schoolId: string,
    input: CreateStudentInput,
  ): Prisma.StudentCreateInput {
    return {
      school: { connect: { id: schoolId } },
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth
        ? parseIsoDate(input.dateOfBirth)
        : undefined,
      gender: input.gender,
      phone: input.phone,
      address: input.address,
    };
  }

  private async validateStudentUser(
    schoolId: string,
    userId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
    });

    if (!user) {
      throw new AppException(
        'INVALID_STUDENT_USER',
        'Người dùng không thuộc trường hoặc không tồn tại',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (user.role !== UserRole.STUDENT) {
      throw new AppException(
        'INVALID_STUDENT_USER',
        'Chỉ có thể gắn tài khoản học sinh',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(
        'INVALID_STUDENT_USER',
        'Tài khoản học sinh không hoạt động',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const existingProfile = await this.prisma.student.findFirst({
      where: { schoolId, userId },
    });

    if (existingProfile) {
      throw new AppException(
        'USER_ALREADY_LINKED',
        'Tài khoản đã được gắn hồ sơ học sinh khác',
        HttpStatus.CONFLICT,
      );
    }
  }

  async findStudentInTenant(schoolId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: studentInclude,
    });

    if (!student) {
      throw new AppException(
        'STUDENT_NOT_FOUND',
        'Không tìm thấy học sinh',
        HttpStatus.NOT_FOUND,
      );
    }

    return student;
  }

  private handleUserLinkViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'USER_ALREADY_LINKED',
        'Tài khoản đã được gắn hồ sơ học sinh khác',
        HttpStatus.CONFLICT,
      );
    }
  }
}
