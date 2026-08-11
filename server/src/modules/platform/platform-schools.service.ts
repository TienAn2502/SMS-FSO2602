import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, SchoolStatus, UserRole } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import { PasswordService } from '@/common/utils/password.service';
import type { PaginationMeta } from '@/common/types/api-response.types';
import {
  toPlatformSchoolCreateResult,
  toPlatformSchoolDetail,
  toPlatformSchoolListItem,
  type PlatformSchoolCreateResult,
  type PlatformSchoolDetail,
  type PlatformSchoolListItem,
} from '@/modules/platform/mappers/platform-school.mapper';
import {
  type CreatePlatformSchoolAdminInput,
  type CreatePlatformSchoolInput,
  type ListPlatformSchoolsQuery,
  type UpdatePlatformSchoolInput,
  type UpdatePlatformSchoolStatusInput,
} from '@/modules/platform/schemas/platform-school.schema';
import { getDefaultGradeLevelsForSchoolType } from '@/modules/platform/constants/default-grade-levels';
import {
  toUserResponse,
  type UserResponse,
} from '@/modules/users/mappers/user.mapper';

@Injectable()
export class PlatformSchoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async list(
    query: ListPlatformSchoolsQuery,
  ): Promise<{ items: PlatformSchoolListItem[]; meta: PaginationMeta }> {
    const where: Prisma.SchoolWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                code: { contains: query.search, mode: 'insensitive' },
              },
              {
                name: { contains: query.search, mode: 'insensitive' },
              },
            ],
          }
        : {}),
    };

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: getSkip(query.page, query.limit),
        take: query.limit,
      }),
      this.prisma.school.count({ where }),
    ]);

    const adminUsers = await this.findPrimaryAdminsForSchools(
      schools.map((school) => school.id),
    );

    return {
      items: schools.map((school) =>
        toPlatformSchoolListItem(school, adminUsers.get(school.id) ?? null),
      ),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(id: string): Promise<PlatformSchoolDetail> {
    const school = await this.findSchoolOrThrow(id);
    const [admin, studentCount, teacherCount] = await Promise.all([
      this.findPrimaryAdmin(id),
      this.prisma.student.count({ where: { schoolId: id } }),
      this.prisma.teacher.count({ where: { schoolId: id } }),
    ]);

    return toPlatformSchoolDetail(school, admin, {
      studentCount,
      teacherCount,
    });
  }

  async create(
    input: CreatePlatformSchoolInput,
  ): Promise<PlatformSchoolCreateResult> {
    const normalizedCode = input.code.trim();

    const existingCode = await this.prisma.school.findUnique({
      where: { code: normalizedCode },
    });

    if (existingCode) {
      throw new AppException(
        'SCHOOL_CODE_EXISTS',
        'Mã trường đã tồn tại',
        HttpStatus.CONFLICT,
      );
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: input.adminEmail },
    });

    if (existingEmail) {
      throw new AppException(
        'ADMIN_EMAIL_EXISTS',
        'Email quản trị viên đã được sử dụng',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await this.passwordService.hash(input.adminPassword);
    const adminFullName =
      input.adminFullName?.trim() || `Quản trị viên ${input.name.trim()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          code: normalizedCode,
          name: input.name.trim(),
          shortName: input.shortName?.trim() || null,
          schoolType: input.schoolType ?? null,
          status: SchoolStatus.ACTIVE,
        },
      });

      const admin = await tx.user.create({
        data: {
          email: input.adminEmail.trim(),
          fullName: adminFullName,
          passwordHash,
          role: UserRole.SCHOOL_ADMIN,
          schoolId: school.id,
        },
      });

      let seededGradeLevelCount = 0;
      const gradeLevelTemplates = getDefaultGradeLevelsForSchoolType(
        school.schoolType,
      );

      if (gradeLevelTemplates.length > 0) {
        await tx.gradeLevel.createMany({
          data: gradeLevelTemplates.map((gradeLevel) => ({
            schoolId: school.id,
            code: gradeLevel.code,
            name: gradeLevel.name,
          })),
        });
        seededGradeLevelCount = gradeLevelTemplates.length;
      }

      return { school, admin, seededGradeLevelCount };
    });

    return toPlatformSchoolCreateResult(
      result.school,
      result.admin,
      result.seededGradeLevelCount,
    );
  }

  async update(id: string, input: UpdatePlatformSchoolInput) {
    await this.findSchoolOrThrow(id);

    await this.prisma.school.update({
      where: { id },
      data: input,
    });

    return this.findById(id);
  }

  async updateStatus(id: string, input: UpdatePlatformSchoolStatusInput) {
    await this.findSchoolOrThrow(id);

    await this.prisma.school.update({
      where: { id },
      data: { status: input.status },
    });

    return this.findById(id);
  }

  async listAdmins(schoolId: string): Promise<UserResponse[]> {
    await this.findSchoolOrThrow(schoolId);

    const admins = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: UserRole.SCHOOL_ADMIN,
      },
      orderBy: { createdAt: 'asc' },
    });

    return admins.map(toUserResponse);
  }

  async createAdmin(
    schoolId: string,
    input: CreatePlatformSchoolAdminInput,
  ): Promise<UserResponse> {
    await this.findSchoolOrThrow(schoolId);

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: input.email.trim() },
    });

    if (existingEmail) {
      throw new AppException(
        'ADMIN_EMAIL_EXISTS',
        'Email quản trị viên đã được sử dụng',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await this.passwordService.hash(input.password);

    const admin = await this.prisma.user.create({
      data: {
        email: input.email.trim(),
        fullName: input.fullName.trim(),
        passwordHash,
        role: UserRole.SCHOOL_ADMIN,
        schoolId,
      },
    });

    return toUserResponse(admin);
  }

  private async findSchoolOrThrow(id: string) {
    const school = await this.prisma.school.findUnique({ where: { id } });

    if (!school) {
      throw new AppException(
        'SCHOOL_NOT_FOUND',
        'Không tìm thấy trường',
        HttpStatus.NOT_FOUND,
      );
    }

    return school;
  }

  private async findPrimaryAdmin(schoolId: string) {
    return this.prisma.user.findFirst({
      where: {
        schoolId,
        role: UserRole.SCHOOL_ADMIN,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async findPrimaryAdminsForSchools(schoolIds: string[]) {
    if (schoolIds.length === 0) {
      return new Map<
        string,
        Awaited<ReturnType<typeof this.findPrimaryAdmin>>
      >();
    }

    const admins = await this.prisma.user.findMany({
      where: {
        schoolId: { in: schoolIds },
        role: UserRole.SCHOOL_ADMIN,
      },
      orderBy: { createdAt: 'asc' },
    });

    const map = new Map<string, (typeof admins)[number]>();
    for (const admin of admins) {
      if (!admin.schoolId || map.has(admin.schoolId)) {
        continue;
      }
      map.set(admin.schoolId, admin);
    }

    return map;
  }
}
