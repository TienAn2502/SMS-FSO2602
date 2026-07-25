import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type GradeLevel } from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../common/database/prisma.service';
import type { PaginationMeta } from '../../common/types/api-response.types';
import {
  buildPaginationMeta,
  getSkip,
} from '../../common/utils/pagination.util';
import {
  toGradeLevelResponse,
  type GradeLevelResponse,
} from './mappers/grade-level.mapper';
import type {
  CreateGradeLevelInput,
  ListGradeLevelsQuery,
  UpdateGradeLevelInput,
} from './schemas/grade-level.schema';

@Injectable()
export class GradeLevelsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    schoolId: string,
    query: ListGradeLevelsQuery,
  ): Promise<{ items: GradeLevelResponse[]; meta: PaginationMeta }> {
    const where: Prisma.GradeLevelWhereInput = {
      schoolId,
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

  async findById(
    schoolId: string,
    gradeLevelId: string,
  ): Promise<GradeLevelResponse> {
    const gradeLevel = await this.findGradeLevelInTenant(
      schoolId,
      gradeLevelId,
    );
    return toGradeLevelResponse(gradeLevel);
  }

  async create(
    schoolId: string,
    input: CreateGradeLevelInput,
  ): Promise<GradeLevelResponse> {
    try {
      const gradeLevel = await this.prisma.gradeLevel.create({
        data: {
          schoolId,
          name: input.name,
          code: input.code,
        },
      });

      return toGradeLevelResponse(gradeLevel);
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async update(
    schoolId: string,
    gradeLevelId: string,
    input: UpdateGradeLevelInput,
  ): Promise<GradeLevelResponse> {
    await this.findGradeLevelInTenant(schoolId, gradeLevelId);

    try {
      const gradeLevel = await this.prisma.gradeLevel.update({
        where: { id: gradeLevelId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.code !== undefined ? { code: input.code } : {}),
        },
      });

      return toGradeLevelResponse(gradeLevel);
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async findGradeLevelInTenant(
    schoolId: string,
    gradeLevelId: string,
  ): Promise<GradeLevel> {
    const gradeLevel = await this.prisma.gradeLevel.findFirst({
      where: { id: gradeLevelId, schoolId },
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

  private handleUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'GRADE_LEVEL_CODE_EXISTS',
        'Mã khối đã tồn tại trong trường',
        HttpStatus.CONFLICT,
      );
    }
  }
}
