import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcademicEntityStatus,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../common/database/prisma.service';
import type { PaginationMeta } from '../../common/types/api-response.types';
import {
  buildPaginationMeta,
  getSkip,
} from '../../common/utils/pagination.util';
import { PasswordService } from '../../common/utils/password.service';
import { StudentsService } from '../students/students.service';
import {
  parentInclude,
  parentListInclude,
  toParentListResponse,
  toParentResponse,
  type ParentResponse,
} from './mappers/parent.mapper';
import type {
  CreateParentInput,
  CreateParentUserInput,
  LinkParentStudentInput,
  LinkParentUserInput,
  ListParentsQuery,
  UpdateParentInput,
  UpdateParentStatusInput,
} from './schemas/parent.schema';

@Injectable()
export class ParentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly studentsService: StudentsService,
  ) {}

  async list(
    schoolId: string,
    query: ListParentsQuery,
  ): Promise<{ items: ParentResponse[]; meta: PaginationMeta }> {
    const where: Prisma.ParentWhereInput = {
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

    const orderBy: Prisma.ParentOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [total, parents] = await this.prisma.$transaction([
      this.prisma.parent.count({ where }),
      this.prisma.parent.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
        include: parentListInclude,
      }),
    ]);

    return {
      items: parents.map(toParentListResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(schoolId: string, parentId: string): Promise<ParentResponse> {
    const parent = await this.findParentInTenant(schoolId, parentId);
    return toParentResponse(parent);
  }

  async create(
    schoolId: string,
    input: CreateParentInput,
  ): Promise<ParentResponse> {
    if (input.account) {
      return this.createWithAccount(schoolId, input);
    }

    const parent = await this.prisma.parent.create({
      data: {
        schoolId,
        fullName: input.fullName,
        phone: input.phone,
      },
      include: parentInclude,
    });

    return toParentResponse(parent);
  }

  async update(
    schoolId: string,
    parentId: string,
    input: UpdateParentInput,
  ): Promise<ParentResponse> {
    const existing = await this.findParentInTenant(schoolId, parentId);

    const parent = await this.prisma.parent.update({
      where: { id: parentId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      },
      include: parentInclude,
    });

    if (input.fullName !== undefined && existing.userId) {
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: { fullName: input.fullName },
      });
    }

    return toParentResponse(parent);
  }

  async updateStatus(
    schoolId: string,
    parentId: string,
    input: UpdateParentStatusInput,
  ): Promise<ParentResponse> {
    await this.findParentInTenant(schoolId, parentId);

    const parent = await this.prisma.parent.update({
      where: { id: parentId },
      data: { status: input.status },
      include: parentInclude,
    });

    return toParentResponse(parent);
  }

  async linkUser(
    schoolId: string,
    parentId: string,
    input: LinkParentUserInput,
  ): Promise<ParentResponse> {
    const parent = await this.findParentInTenant(schoolId, parentId);

    if (parent.userId) {
      throw new AppException(
        'USER_ALREADY_LINKED',
        'Phụ huynh đã được gắn tài khoản',
        HttpStatus.CONFLICT,
      );
    }

    await this.validateParentUser(schoolId, input.userId);

    try {
      const updated = await this.prisma.parent.update({
        where: { id: parentId },
        data: { userId: input.userId },
        include: parentInclude,
      });

      return toParentResponse(updated);
    } catch (error: unknown) {
      this.handleUserLinkViolation(error);
      throw error;
    }
  }

  async createUser(
    schoolId: string,
    parentId: string,
    input: CreateParentUserInput,
  ): Promise<ParentResponse> {
    const parent = await this.findParentInTenant(schoolId, parentId);

    if (parent.userId) {
      throw new AppException(
        'USER_ALREADY_LINKED',
        'Phụ huynh đã được gắn tài khoản',
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
        const user = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            fullName: parent.fullName,
            role: UserRole.PARENT,
            schoolId,
            status: UserStatus.ACTIVE,
          },
        });

        return tx.parent.update({
          where: { id: parentId },
          data: { userId: user.id },
          include: parentInclude,
        });
      });

      return toParentResponse(updated);
    } catch (error: unknown) {
      this.handleUserLinkViolation(error);
      throw error;
    }
  }

  async linkStudent(
    schoolId: string,
    parentId: string,
    input: LinkParentStudentInput,
  ): Promise<ParentResponse> {
    await this.findParentInTenant(schoolId, parentId);
    await this.studentsService.findStudentInTenant(schoolId, input.studentId);

    const existingLink = await this.prisma.studentParent.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId: input.studentId,
        },
      },
    });

    if (existingLink) {
      throw new AppException(
        'STUDENT_ALREADY_LINKED',
        'Học sinh đã được liên kết với phụ huynh này',
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (input.isPrimaryContact) {
        await tx.studentParent.updateMany({
          where: { schoolId, studentId: input.studentId },
          data: { isPrimaryContact: false },
        });
      }

      await tx.studentParent.create({
        data: {
          schoolId,
          parentId,
          studentId: input.studentId,
          relationship: input.relationship,
          isPrimaryContact: input.isPrimaryContact ?? false,
        },
      });
    });

    const parent = await this.findParentInTenant(schoolId, parentId);
    return toParentResponse(parent);
  }

  async unlinkStudent(
    schoolId: string,
    parentId: string,
    studentId: string,
  ): Promise<ParentResponse> {
    await this.findParentInTenant(schoolId, parentId);

    const link = await this.prisma.studentParent.findFirst({
      where: { schoolId, parentId, studentId },
    });

    if (!link) {
      throw new AppException(
        'STUDENT_LINK_NOT_FOUND',
        'Không có liên kết phụ huynh ↔ học sinh',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.studentParent.delete({ where: { id: link.id } });

    const parent = await this.findParentInTenant(schoolId, parentId);
    return toParentResponse(parent);
  }

  async findParentInTenant(schoolId: string, parentId: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { id: parentId, schoolId },
      include: parentInclude,
    });

    if (!parent) {
      throw new AppException(
        'PARENT_NOT_FOUND',
        'Không tìm thấy phụ huynh',
        HttpStatus.NOT_FOUND,
      );
    }

    return parent;
  }

  async findParentByUserId(schoolId: string, userId: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { schoolId, userId, status: AcademicEntityStatus.ACTIVE },
      include: parentInclude,
    });

    if (!parent) {
      throw new AppException(
        'PARENT_NOT_FOUND',
        'Không tìm thấy hồ sơ phụ huynh',
        HttpStatus.NOT_FOUND,
      );
    }

    return parent;
  }

  private async createWithAccount(
    schoolId: string,
    input: CreateParentInput,
  ): Promise<ParentResponse> {
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
      const parent = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: account.email,
            passwordHash,
            fullName: input.fullName,
            role: UserRole.PARENT,
            schoolId,
            status: UserStatus.ACTIVE,
          },
        });

        return tx.parent.create({
          data: {
            schoolId,
            fullName: input.fullName,
            phone: input.phone,
            userId: user.id,
          },
          include: parentInclude,
        });
      });

      return toParentResponse(parent);
    } catch (error: unknown) {
      this.handleUserLinkViolation(error);
      throw error;
    }
  }

  private async validateParentUser(
    schoolId: string,
    userId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
    });

    if (!user) {
      throw new AppException(
        'INVALID_PARENT_USER',
        'Người dùng không thuộc trường hoặc không tồn tại',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (user.role !== UserRole.PARENT) {
      throw new AppException(
        'INVALID_PARENT_USER',
        'Chỉ có thể gắn tài khoản phụ huynh',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(
        'INVALID_PARENT_USER',
        'Tài khoản phụ huynh không hoạt động',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const existingProfile = await this.prisma.parent.findFirst({
      where: { schoolId, userId },
    });

    if (existingProfile) {
      throw new AppException(
        'USER_ALREADY_LINKED',
        'Tài khoản đã được gắn hồ sơ phụ huynh khác',
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
        'Tài khoản đã được gắn hồ sơ phụ huynh khác',
        HttpStatus.CONFLICT,
      );
    }
  }
}
