import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { parseIsoDate } from '@/common/schemas/academic.schema';
import type { PaginationMeta } from '@/common/types/api-response.types';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import { PasswordService } from '@/common/utils/password.service';
import {
  teacherInclude,
  teacherListInclude,
  toTeacherListResponse,
  toTeacherResponse,
  type TeacherResponse,
} from '@/modules/teachers/mappers/teacher.mapper';
import type {
  CreateTeacherInput,
  CreateTeacherUserInput,
  LinkTeacherUserInput,
  ListTeachersQuery,
  UpdateTeacherInput,
  UpdateTeacherStatusInput,
} from '@/modules/teachers/schemas/teacher.schema';

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async list(
    schoolId: string,
    query: ListTeachersQuery,
  ): Promise<{ items: TeacherResponse[]; meta: PaginationMeta }> {
    const where: Prisma.TeacherWhereInput = {
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
    };

    const orderBy: Prisma.TeacherOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [total, teachers] = await this.prisma.$transaction([
      this.prisma.teacher.count({ where }),
      this.prisma.teacher.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
        include: teacherListInclude,
      }),
    ]);

    return {
      items: teachers.map(toTeacherListResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(
    schoolId: string,
    teacherId: string,
  ): Promise<TeacherResponse> {
    const teacher = await this.findTeacherInTenant(schoolId, teacherId);
    return toTeacherResponse(teacher);
  }

  async create(
    schoolId: string,
    input: CreateTeacherInput,
  ): Promise<TeacherResponse> {
    // Nếu có tài khoản, tạo hồ sơ giáo viên và gắn tài khoản
    if (input.account) {
      return this.createWithAccount(schoolId, input);
    }

    const teacher = await this.prisma.teacher.create({
      data: this.buildTeacherCreateData(schoolId, input),
      include: teacherInclude,
    });

    return toTeacherResponse(teacher);
  }

  async update(
    schoolId: string,
    teacherId: string,
    input: UpdateTeacherInput,
  ): Promise<TeacherResponse> {
    const existing = await this.findTeacherInTenant(schoolId, teacherId);

    const teacher = await this.prisma.teacher.update({
      where: { id: teacherId },
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
        ...(input.specialization !== undefined
          ? { specialization: input.specialization }
          : {}),
      },
      include: teacherInclude,
    });

    if (input.fullName !== undefined && existing.userId) {
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: { fullName: input.fullName },
      });
    }

    return toTeacherResponse(teacher);
  }

  async updateStatus(
    schoolId: string,
    teacherId: string,
    input: UpdateTeacherStatusInput,
  ): Promise<TeacherResponse> {
    await this.findTeacherInTenant(schoolId, teacherId);

    const teacher = await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { status: input.status },
      include: teacherInclude,
    });

    return toTeacherResponse(teacher);
  }

  async linkUser(
    schoolId: string,
    teacherId: string,
    input: LinkTeacherUserInput,
  ): Promise<TeacherResponse> {
    const teacher = await this.findTeacherInTenant(schoolId, teacherId);

    if (teacher.userId) {
      throw new AppException(
        'USER_ALREADY_LINKED',
        'Giáo viên đã được gắn tài khoản',
        HttpStatus.CONFLICT,
      );
    }

    await this.validateTeacherUser(schoolId, input.userId);

    try {
      const updated = await this.prisma.teacher.update({
        where: { id: teacherId },
        data: { userId: input.userId },
        include: teacherInclude,
      });

      return toTeacherResponse(updated);
    } catch (error: unknown) {
      this.handleUserLinkViolation(error);
      throw error;
    }
  }

  async createUser(
    schoolId: string,
    teacherId: string,
    input: CreateTeacherUserInput,
  ): Promise<TeacherResponse> {
    const teacher = await this.findTeacherInTenant(schoolId, teacherId);

    if (teacher.userId) {
      throw new AppException(
        'USER_ALREADY_LINKED',
        'Giáo viên đã được gắn tài khoản',
        HttpStatus.CONFLICT,
      );
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingEmail) {
      throw new AppException(
        'EMAIL_ALREADY_EXISTS',
        'Email đã được sử dụng',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await this.passwordService.hash(input.password);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        // Tạo tài khoản và gắn role giáo viên
        const user = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            fullName: teacher.fullName,
            role: UserRole.TEACHER,
            schoolId,
            status: UserStatus.ACTIVE,
          },
        });

        // Gắn tài khoản vào hồ sơ giáo viên
        return tx.teacher.update({
          where: { id: teacherId },
          data: { userId: user.id },
          include: teacherInclude,
        });
      });

      return toTeacherResponse(updated);
    } catch (error: unknown) {
      this.handleUserLinkViolation(error);
      throw error;
    }
  }

  async findTeacherInTenant(schoolId: string, teacherId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      include: teacherInclude,
    });

    if (!teacher) {
      throw new AppException(
        'TEACHER_NOT_FOUND',
        'Không tìm thấy giáo viên',
        HttpStatus.NOT_FOUND,
      );
    }

    return teacher;
  }

  private async createWithAccount(
    schoolId: string,
    input: CreateTeacherInput,
  ): Promise<TeacherResponse> {
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
      const teacher = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: account.email,
            passwordHash,
            fullName: input.fullName,
            role: UserRole.TEACHER,
            schoolId,
            status: UserStatus.ACTIVE,
          },
        });

        return tx.teacher.create({
          data: {
            schoolId,
            fullName: input.fullName,
            dateOfBirth: input.dateOfBirth
              ? parseIsoDate(input.dateOfBirth)
              : undefined,
            gender: input.gender,
            phone: input.phone,
            address: input.address,
            specialization: input.specialization,
            userId: user.id,
          },
          include: teacherInclude,
        });
      });

      return toTeacherResponse(teacher);
    } catch (error: unknown) {
      this.handleUserLinkViolation(error);
      throw error;
    }
  }

  private buildTeacherCreateData(
    schoolId: string,
    input: CreateTeacherInput,
  ): Prisma.TeacherCreateInput {
    return {
      school: { connect: { id: schoolId } },
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth
        ? parseIsoDate(input.dateOfBirth)
        : undefined,
      gender: input.gender,
      phone: input.phone,
      address: input.address,
      specialization: input.specialization,
    };
  }

  private async validateTeacherUser(
    schoolId: string,
    userId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
    });

    if (!user) {
      throw new AppException(
        'INVALID_TEACHER_USER',
        'Người dùng không thuộc trường hoặc không tồn tại',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (user.role !== UserRole.TEACHER) {
      throw new AppException(
        'INVALID_TEACHER_USER',
        'Chỉ có thể gắn tài khoản giáo viên',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(
        'INVALID_TEACHER_USER',
        'Tài khoản giáo viên không hoạt động',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const existingProfile = await this.prisma.teacher.findFirst({
      where: { schoolId, userId },
    });

    if (existingProfile) {
      throw new AppException(
        'USER_ALREADY_LINKED',
        'Tài khoản đã được gắn hồ sơ giáo viên khác',
        HttpStatus.CONFLICT,
      );
    }
  }

  private handleUserLinkViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'USER_ALREADY_LINKED',
        'Tài khoản đã được gắn hồ sơ giáo viên khác',
        HttpStatus.CONFLICT,
      );
    }
  }
}
