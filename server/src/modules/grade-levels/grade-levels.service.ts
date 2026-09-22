import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type GradeLevel } from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import type { PaginationMeta } from '@/common/types/api-response.types';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import {
  toGradeLevelResponse,
  type GradeLevelResponse,
} from '@/modules/grade-levels/mappers/grade-level.mapper';
import type { ListGradeLevelsQuery } from '@/modules/grade-levels/schemas/grade-level.schema';
import { UserRole } from '@prisma/client';

@Injectable()
export class GradeLevelsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthenticatedUser,
    query: ListGradeLevelsQuery,
  ): Promise<{ items: GradeLevelResponse[]; meta: PaginationMeta }> {
    const isSystemAdmin = user.role === UserRole.SYSTEM_ADMIN;

    // System Admin: lấy tất cả grade levels không filter theo tenant
    // School Admin: đã được filter trong TenantGuard
    const where: Prisma.GradeLevelWhereInput = {
      ...(isSystemAdmin
        ? {} // System Admin: lấy tất cả
        : {}), // School Admin: TenantGuard đã filter rồi
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                code: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.GradeLevelOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [total, gradeLevels] = await this.prisma.$transaction([
      this.prisma.gradeLevel.count({ where }),
      this.prisma.gradeLevel.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
      }),
    ]);

    return {
      items: gradeLevels.map(toGradeLevelResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(gradeLevelId: string): Promise<GradeLevelResponse> {
    const gradeLevel = await this.findGradeLevelInTenant(gradeLevelId);
    return toGradeLevelResponse(gradeLevel);
  }

  async findGradeLevelInTenant(gradeLevelId: string): Promise<GradeLevel> {
    const gradeLevel = await this.prisma.gradeLevel.findFirst({
      where: { id: gradeLevelId },
    });

    if (!gradeLevel) {
      throw new AppException(
        'GRADE_LEVEL_NOT_FOUND',
        'Không tìm thấy khối',
        HttpStatus.NOT_FOUND,
      );
    }

    return gradeLevel;
  }
}
