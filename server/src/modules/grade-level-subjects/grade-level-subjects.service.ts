import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import type { PaginationMeta } from '@/common/types/api-response.types';
import {
  buildPaginationMeta,
  getSkip,
} from '@/common/utils/pagination.util';
import {
  toGradeLevelSubjectResponse,
  type GradeLevelSubjectResponse,
} from '@/modules/grade-level-subjects/mappers/grade-level-subject.mapper';
import type {
  ListGradeLevelSubjectsQuery,
  UpdateGradeLevelSubjectInput,
} from '@/modules/grade-level-subjects/schemas/grade-level-subject.schema';

const gradeLevelSubjectInclude = {
  gradeLevel: {
    select: { id: true, code: true, name: true },
  },
  subject: {
    select: { id: true, code: true, name: true, status: true },
  },
} satisfies Prisma.GradeLevelSubjectInclude;

@Injectable()
export class GradeLevelSubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    schoolId: string,
    query: ListGradeLevelSubjectsQuery,
  ): Promise<{ items: GradeLevelSubjectResponse[]; meta: PaginationMeta }> {
    const where: Prisma.GradeLevelSubjectWhereInput = {
      schoolId,
      ...(query.gradeLevelId ? { gradeLevelId: query.gradeLevelId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const orderBy = this.resolveOrderBy(query.sortBy, query.sortOrder);

    const [total, records] = await this.prisma.$transaction([
      this.prisma.gradeLevelSubject.count({ where }),
      this.prisma.gradeLevelSubject.findMany({
        where,
        include: gradeLevelSubjectInclude,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
      }),
    ]);

    return {
      items: records.map(toGradeLevelSubjectResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(
    schoolId: string,
    gradeLevelSubjectId: string,
  ): Promise<GradeLevelSubjectResponse> {
    const record = await this.findGradeLevelSubjectInTenant(
      schoolId,
      gradeLevelSubjectId,
    );
    return toGradeLevelSubjectResponse(record);
  }

  async update(
    schoolId: string,
    gradeLevelSubjectId: string,
    input: UpdateGradeLevelSubjectInput,
  ): Promise<GradeLevelSubjectResponse> {
    await this.findGradeLevelSubjectInTenant(schoolId, gradeLevelSubjectId);

    const record = await this.prisma.gradeLevelSubject.update({
      where: { id: gradeLevelSubjectId },
      data: {
        ...(input.periodsPerYear !== undefined
          ? { periodsPerYear: input.periodsPerYear }
          : {}),
        ...(input.isRequired !== undefined
          ? { isRequired: input.isRequired }
          : {}),
        ...(input.evaluationMode !== undefined
          ? { evaluationMode: input.evaluationMode }
          : {}),
      },
      include: gradeLevelSubjectInclude,
    });

    return toGradeLevelSubjectResponse(record);
  }

  private resolveOrderBy(
    sortBy: ListGradeLevelSubjectsQuery['sortBy'],
    sortOrder: ListGradeLevelSubjectsQuery['sortOrder'],
  ): Prisma.GradeLevelSubjectOrderByWithRelationInput[] {
    switch (sortBy) {
      case 'subjectCode':
        return [{ subject: { code: sortOrder } }];
      case 'subjectName':
        return [{ subject: { name: sortOrder } }];
      case 'periodsPerYear':
        return [{ periodsPerYear: sortOrder }];
      case 'evaluationMode':
        return [{ evaluationMode: sortOrder }];
      case 'gradeLevelCode':
      default:
        return [
          { gradeLevel: { code: sortOrder } },
          { subject: { code: 'asc' } },
        ];
    }
  }

  private async findGradeLevelSubjectInTenant(
    schoolId: string,
    gradeLevelSubjectId: string,
  ) {
    const record = await this.prisma.gradeLevelSubject.findFirst({
      where: { id: gradeLevelSubjectId, schoolId },
      include: gradeLevelSubjectInclude,
    });

    if (!record) {
      throw new AppException(
        'GRADE_LEVEL_SUBJECT_NOT_FOUND',
        'Không tìm thấy cấu hình môn theo khối',
        HttpStatus.NOT_FOUND,
      );
    }

    return record;
  }
}
