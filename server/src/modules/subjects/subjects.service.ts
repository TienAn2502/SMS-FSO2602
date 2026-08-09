import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type Subject } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import type { PaginationMeta } from '@/common/types/api-response.types';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import {
  toSubjectResponse,
  type SubjectResponse,
} from '@/modules/subjects/mappers/subject.mapper';
import type {
  CreateSubjectInput,
  ListSubjectsQuery,
  UpdateSubjectInput,
  UpdateSubjectStatusInput,
} from '@/modules/subjects/schemas/subject.schema';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    schoolId: string,
    query: ListSubjectsQuery,
  ): Promise<{ items: SubjectResponse[]; meta: PaginationMeta }> {
    const where: Prisma.SubjectWhereInput = {
      schoolId,
      ...(query.status ? { status: query.status } : {}),
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
              {
                description: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.SubjectOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [total, subjects] = await this.prisma.$transaction([
      this.prisma.subject.count({ where }),
      this.prisma.subject.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
      }),
    ]);

    return {
      items: subjects.map(toSubjectResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(
    schoolId: string,
    subjectId: string,
  ): Promise<SubjectResponse> {
    const subject = await this.findSubjectInTenant(schoolId, subjectId);
    return toSubjectResponse(subject);
  }

  async create(
    schoolId: string,
    input: CreateSubjectInput,
  ): Promise<SubjectResponse> {
    try {
      const subject = await this.prisma.subject.create({
        data: {
          schoolId,
          code: input.code,
          name: input.name,
          description: input.description ?? null,
        },
      });

      return toSubjectResponse(subject);
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async update(
    schoolId: string,
    subjectId: string,
    input: UpdateSubjectInput,
  ): Promise<SubjectResponse> {
    await this.findSubjectInTenant(schoolId, subjectId);

    try {
      const subject = await this.prisma.subject.update({
        where: { id: subjectId },
        data: {
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
        },
      });

      return toSubjectResponse(subject);
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async updateStatus(
    schoolId: string,
    subjectId: string,
    input: UpdateSubjectStatusInput,
  ): Promise<SubjectResponse> {
    await this.findSubjectInTenant(schoolId, subjectId);

    const subject = await this.prisma.subject.update({
      where: { id: subjectId },
      data: { status: input.status },
    });

    return toSubjectResponse(subject);
  }

  async findSubjectInTenant(
    schoolId: string,
    subjectId: string,
  ): Promise<Subject> {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
    });

    if (!subject) {
      throw new AppException(
        'SUBJECT_NOT_FOUND',
        'Không tìm thấy môn học',
        HttpStatus.NOT_FOUND,
      );
    }

    return subject;
  }

  private handleUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'SUBJECT_CODE_EXISTS',
        'Mã môn đã tồn tại trong trường',
        HttpStatus.CONFLICT,
      );
    }
  }
}
