import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, SchoolType } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import type { PaginationMeta } from '@/common/types/api-response.types';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import {
  toGradeLevelSubjectResponse,
  type GradeLevelSubjectResponse,
} from '@/modules/grade-level-subjects/mappers/grade-level-subject.mapper';
import type {
  BatchUpdateGradeLevelSubjectsInput,
  ListGradeLevelSubjectsQuery,
  UpdateGradeLevelSubjectInput,
} from '@/modules/grade-level-subjects/schemas/grade-level-subject.schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gradeLevelSubjectInclude: any = {
  gradeLevel: {
    select: { id: true, code: true, name: true },
  },
  subject: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      schoolId: true,
    },
  },
};

// Helper: Type for record returned by include
type GradeLevelSubjectRecord = Prisma.GradeLevelSubjectGetPayload<
  typeof gradeLevelSubjectInclude
>;

@Injectable()
export class GradeLevelSubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    schoolId: string,
    query: ListGradeLevelSubjectsQuery,
  ): Promise<{ items: GradeLevelSubjectResponse[]; meta: PaginationMeta }> {
    // 1. Lấy school type
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { schoolType: true },
    });

    // 2. Xác định grade level codes theo school type
    const gradeLevelCodes = this.getGradeLevelCodesForSchoolType(
      school?.schoolType,
    );

    // 3. Build where clause
    const where: Prisma.GradeLevelSubjectWhereInput = {
      // Nếu có filter theo khối cụ thể thì dùng, không thì lọc theo school type
      ...(query.gradeLevelId
        ? { gradeLevelId: query.gradeLevelId }
        : { gradeLevel: { code: { in: gradeLevelCodes } } }),
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
      items: records.map((r) => toGradeLevelSubjectResponse(r as any)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async listForSystemAdmin(
    query: ListGradeLevelSubjectsQuery,
  ): Promise<{ items: GradeLevelSubjectResponse[]; meta: PaginationMeta }> {
    // 3. Build where clause
    const where: Prisma.GradeLevelSubjectWhereInput = {
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
      items: records.map((r) => toGradeLevelSubjectResponse(r as any)),
      meta: buildPaginationMeta(query.page, query.limit, total),
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
        return []; // Không có school type thì không trả về gì
    }
  }

  async findById(
    schoolId: string | undefined,
    gradeLevelSubjectId: string,
    isSystemAdmin: boolean = false,
  ): Promise<GradeLevelSubjectResponse> {
    const record = await this.findGradeLevelSubjectInTenant(
      schoolId,
      gradeLevelSubjectId,
      isSystemAdmin,
    );
    return toGradeLevelSubjectResponse(record as any);
  }

  async updateMany(
    schoolId: string | undefined,
    updates: BatchUpdateGradeLevelSubjectsInput['updates'],
    isSystemAdmin: boolean = false,
  ): Promise<GradeLevelSubjectResponse[]> {
    // Validate all records exist and belong to tenant before updating
    const ids = updates.map((u) => u.id);

    const existingRecords = await this.prisma.gradeLevelSubject.findMany({
      where: {
        id: { in: ids },
        subject: {
          schoolId: isSystemAdmin ? null : schoolId,
        },
      },
      include: gradeLevelSubjectInclude as Prisma.GradeLevelSubjectInclude,
    });

    const foundIds = new Set(existingRecords.map((r) => r.id));
    const missingIds = ids.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new AppException(
        'GRADE_LEVEL_SUBJECT_NOT_FOUND',
        `Không tìm thấy bản ghi với id: ${missingIds.join(', ')}`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Update all records in a transaction
    const updatedRecords = await this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.gradeLevelSubject.update({
          where: { id: update.id },
          data: {
            ...(update.periodsPerYear !== undefined
              ? { periodsPerYear: update.periodsPerYear }
              : {}),
            ...(update.isRequired !== undefined
              ? { isRequired: update.isRequired }
              : {}),
            ...(update.evaluationMode !== undefined
              ? { evaluationMode: update.evaluationMode }
              : {}),
          },
          include: gradeLevelSubjectInclude,
        }),
      ),
    );

    return updatedRecords.map((r) => toGradeLevelSubjectResponse(r as any));
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
    schoolId: string | undefined,
    gradeLevelSubjectId: string,
    isSystemAdmin: boolean = false,
  ): Promise<GradeLevelSubjectRecord> {
    // System admin can access any record
    const whereClause = isSystemAdmin
      ? { id: gradeLevelSubjectId, schoolId: null }
      : {
          id: gradeLevelSubjectId,
          // Verify record belongs to tenant's school via subject.schoolId
          subject: { schoolId: schoolId },
        };

    const record = await this.prisma.gradeLevelSubject.findFirst({
      where: whereClause,
      include: gradeLevelSubjectInclude,
    });

    if (!record) {
      throw new AppException(
        'GRADE_LEVEL_SUBJECT_NOT_FOUND',
        'Không tìm thấy cấu hình môn theo khối hoặc bạn không có quyền truy cập',
        HttpStatus.NOT_FOUND,
      );
    }

    return record;
  }
}
