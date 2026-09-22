import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, SchoolType, type Subject } from '@prisma/client';

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
    isSystemAdmin: boolean,
  ): Promise<{ items: SubjectResponse[]; meta: PaginationMeta }> {
    const orderBy: Prisma.SubjectOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    let subjects: Subject[];
    let total: number;

    if (isSystemAdmin) {
      [total, subjects] = await this.prisma.$transaction([
        this.prisma.subject.count({ where: this.buildSearchFilter(query) }),
        this.prisma.subject.findMany({
          where: this.buildSearchFilter(query),
          orderBy,
          skip: getSkip(query.page, query.limit),
          take: query.limit,
        }),
      ]);
    } else {
      const { where } = await this.buildSchoolAdminFilter(schoolId, query);
      [total, subjects] = await this.prisma.$transaction([
        this.prisma.subject.count({ where }),
        this.prisma.subject.findMany({
          where,
          orderBy,
          skip: getSkip(query.page, query.limit),
          take: query.limit,
        }),
      ]);
    }

    return {
      items: subjects.map(toSubjectResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  // Helper: Build search filter cho cả system admin và school admin
  private buildSearchFilter(
    query: ListSubjectsQuery,
  ): Prisma.SubjectWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  // Helper: Build filter cho school admin (BGD subjects + school subjects)
  private async buildSchoolAdminFilter(
    schoolId: string,
    query: ListSubjectsQuery,
  ): Promise<{ where: Prisma.SubjectWhereInput }> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { schoolType: true },
    });

    const gradeLevelCodes = this.getGradeLevelCodesForSchoolType(
      school?.schoolType,
    );

    // Lấy subject IDs từ GradeLevelSubject của các khối trường (BGD subjects)
    const gradeLevelSubjectSubjects =
      await this.prisma.gradeLevelSubject.findMany({
        where: { gradeLevel: { code: { in: gradeLevelCodes } } },
        select: { subjectId: true },
      });
    const bgdSubjectIds = [
      ...new Set(gradeLevelSubjectSubjects.map((g) => g.subjectId)),
    ];

    const baseFilter = this.buildSearchFilter(query);

    return {
      where: {
        ...baseFilter,
        OR: [
          { schoolId: null, id: { in: bgdSubjectIds } }, // BGD subjects theo khối
          { schoolId: schoolId }, // Môn của trường
        ],
      },
    };
  }

  // Helper method để lấy grade level codes theo school type
  private getGradeLevelCodesForSchoolType(
    schoolType: SchoolType | undefined | null,
  ): string[] {
    switch (schoolType) {
      case 'TH':
        return ['1', '2', '3', '4', '5'];
      case 'THCS':
        return ['6', '7', '8', '9'];
      case 'THPT':
        return ['10', '11', '12'];
      default:
        return [];
    }
  }

  async findById(
    schoolId: string,
    subjectId: string,
    isSystemAdmin: boolean = false,
  ): Promise<SubjectResponse> {
    const subject = await this.findSubjectInTenant(
      schoolId,
      subjectId,
      isSystemAdmin,
    );
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
    allowBgdSubjects: boolean = false,
  ): Promise<Subject> {
    const subject = await this.prisma.subject.findFirst({
      where: allowBgdSubjects
        ? {
            id: subjectId,
            OR: [
              { schoolId: schoolId },
              { schoolId: null }, // BGD subjects
            ],
          }
        : { id: subjectId, schoolId },
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
