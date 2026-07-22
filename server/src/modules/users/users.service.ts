import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../common/database/prisma.service';
import {
  buildPaginationMeta,
  getSkip,
} from '../../common/utils/pagination.util';
import { PasswordService } from '../../common/utils/password.service';
import type { PaginationMeta } from '../../common/types/api-response.types';
import { toUserResponse, type UserResponse } from './mappers/user.mapper';
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
  UpdateUserStatusInput,
} from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async list(
    schoolId: string,
    query: ListUsersQuery,
  ): Promise<{ items: UserResponse[]; meta: PaginationMeta }> {
    const where: Prisma.UserWhereInput = {
      schoolId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            // email hoặc fullName chứa search value
            // không phân biệt hoa thường => mode: 'insensitive'
            OR: [
              {
                email: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                fullName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
      }),
    ]);

    return {
      items: users.map(toUserResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(schoolId: string, userId: string): Promise<UserResponse> {
    const user = await this.findUserInTenant(schoolId, userId);
    return toUserResponse(user);
  }

  async create(
    schoolId: string,
    input: CreateUserInput,
  ): Promise<UserResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new AppException(
        'EMAIL_ALREADY_EXISTS',
        'Email đã được sử dụng',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await this.passwordService.hash(input.password);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash,
        role: input.role,
        schoolId,
      },
    });

    return toUserResponse(user);
  }

  async update(
    schoolId: string,
    userId: string,
    input: UpdateUserInput,
  ): Promise<UserResponse> {
    await this.findUserInTenant(schoolId, userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
      },
    });

    return toUserResponse(user);
  }

  async updateStatus(
    schoolId: string,
    userId: string,
    actorId: string,
    input: UpdateUserStatusInput,
  ): Promise<UserResponse> {
    if (userId === actorId && input.status !== 'ACTIVE') {
      throw new AppException(
        'FORBIDDEN',
        'Không thể khóa tài khoản của chính bạn',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.findUserInTenant(schoolId, userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: input.status },
    });

    return toUserResponse(user);
  }

  private async findUserInTenant(schoolId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
    });

    if (!user) {
      throw new AppException(
        'USER_NOT_FOUND',
        'Không tìm thấy người dùng',
        HttpStatus.NOT_FOUND,
      );
    }

    return user;
  }
}
