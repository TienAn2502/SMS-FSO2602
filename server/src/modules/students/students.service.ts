import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { STUDENT_YEAR_ENROLLMENT_STATUSES } from '@/common/utils/enrollment-status.util';
import { parseIsoDate } from '@/common/schemas/academic.schema';
import type { PaginationMeta } from '@/common/types/api-response.types';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import { PasswordService } from '@/common/utils/password.service';
import { PersonCodeService } from '@/common/utils/person-code.service';
import {
  buildDefaultPersonPassword,
  buildPersonLoginEmail,
} from '@/common/utils/person-login-credentials.util';
import {
  studentInclude,
  toStudentResponse,
  type StudentResponse,
} from '@/modules/students/mappers/student.mapper';
import type {
  CreateStudentInput,
  CreateStudentUserInput,
  LinkStudentUserInput,
  ListStudentsQuery,
  UpdateStudentInput,
  UpdateStudentStatusInput,
} from '@/modules/students/schemas/student.schema';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly personCodeService: PersonCodeService,
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
                externalCode: {
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
                status: { in: STUDENT_YEAR_ENROLLMENT_STATUSES },
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
    if (input.createLogin || input.account) {
      return this.createWithAccount(schoolId, input);
    }

    const student = await this.prisma.student.create({
      data: await this.buildStudentCreateData(schoolId, input),
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

  async createUser(
    schoolId: string,
    studentId: string,
    _input: CreateStudentUserInput,
  ): Promise<StudentResponse> {
    const student = await this.findStudentInTenant(schoolId, studentId);

    if (student.userId) {
      throw new AppException(
        'USER_ALREADY_LINKED',
        'Học sinh đã được gắn tài khoản',
        HttpStatus.CONFLICT,
      );
    }

    if (!student.dateOfBirth) {
      throw new AppException(
        'VALIDATION_ERROR',
        'Ngày sinh là bắt buộc khi tạo tài khoản đăng nhập',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        let externalCode = student.externalCode;
        if (!externalCode) {
          externalCode = await this.personCodeService.nextStudentCode(
            schoolId,
            tx,
          );
          await tx.student.update({
            where: { id: studentId },
            data: { externalCode },
          });
        }

        const email = buildPersonLoginEmail(schoolId, externalCode);
        const password = buildDefaultPersonPassword({
          externalCode,
          dateOfBirth: student.dateOfBirth,
        });

        const existingEmail = await tx.user.findUnique({ where: { email } });
        if (existingEmail) {
          throw new AppException(
            'EMAIL_ALREADY_EXISTS',
            'Email nội bộ đã được sử dụng',
            HttpStatus.CONFLICT,
          );
        }

        const passwordHash = await this.passwordService.hash(password);
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            fullName: student.fullName,
            role: UserRole.STUDENT,
            schoolId,
            status: UserStatus.ACTIVE,
          },
        });

        return tx.student.update({
          where: { id: studentId },
          data: { userId: user.id },
          include: studentInclude,
        });
      });

      return toStudentResponse(updated);
    } catch (error: unknown) {
      if (error instanceof AppException) {
        throw error;
      }
      this.handleUserLinkViolation(error);
      throw error;
    }
  }

  private async createWithAccount(
    schoolId: string,
    input: CreateStudentInput,
  ): Promise<StudentResponse> {
    if (!input.dateOfBirth) {
      throw new AppException(
        'VALIDATION_ERROR',
        'Ngày sinh là bắt buộc khi tạo tài khoản đăng nhập',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    try {
      const student = await this.prisma.$transaction(async (tx) => {
        const externalCode = await this.personCodeService.nextStudentCode(
          schoolId,
          tx,
        );
        const email = buildPersonLoginEmail(schoolId, externalCode);
        const password = buildDefaultPersonPassword({
          externalCode,
          dateOfBirth: input.dateOfBirth,
        });

        const existingEmail = await tx.user.findUnique({ where: { email } });
        if (existingEmail) {
          throw new AppException(
            'EMAIL_ALREADY_EXISTS',
            'Email nội bộ đã được sử dụng',
            HttpStatus.CONFLICT,
          );
        }

        const passwordHash = await this.passwordService.hash(password);
        const user = await tx.user.create({
          data: {
            email,
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
            dateOfBirth: parseIsoDate(input.dateOfBirth!),
            gender: input.gender,
            phone: input.phone,
            address: input.address,
            externalCode,
            userId: user.id,
          },
          include: studentInclude,
        });
      });

      return toStudentResponse(student);
    } catch (error: unknown) {
      if (error instanceof AppException) {
        throw error;
      }
      this.handleUserLinkViolation(error);
      throw error;
    }
  }

  private async buildStudentCreateData(
    schoolId: string,
    input: CreateStudentInput,
  ): Promise<Prisma.StudentCreateInput> {
    const externalCode = await this.personCodeService.nextStudentCode(schoolId);

    return {
      school: { connect: { id: schoolId } },
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth
        ? parseIsoDate(input.dateOfBirth)
        : undefined,
      gender: input.gender,
      phone: input.phone,
      address: input.address,
      externalCode,
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
