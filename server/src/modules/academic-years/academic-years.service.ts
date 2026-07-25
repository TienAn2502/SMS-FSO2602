import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type AcademicYear } from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../common/database/prisma.service';
import type { PrismaTransactionClient } from '../../common/database/prisma-transaction.type';
import {
  parseIsoDate,
  toIsoDateString,
} from '../../common/schemas/academic.schema';
import type { PaginationMeta } from '../../common/types/api-response.types';
import {
  buildPaginationMeta,
  getSkip,
} from '../../common/utils/pagination.util';
import { validateDateRangeOrThrow } from '../../common/utils/date-range.util';
import {
  toAcademicYearResponse,
  type AcademicYearResponse,
} from './mappers/academic-year.mapper';
import type {
  CreateAcademicYearInput,
  ListAcademicYearsQuery,
  UpdateAcademicYearInput,
  UpdateAcademicYearStatusInput,
} from './schemas/academic-year.schema';

@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    schoolId: string,
    query: ListAcademicYearsQuery,
  ): Promise<{ items: AcademicYearResponse[]; meta: PaginationMeta }> {
    const where: Prisma.AcademicYearWhereInput = {
      schoolId,
      ...(query.status ? { status: query.status } : {}),
    };

    const orderBy: Prisma.AcademicYearOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [total, academicYears] = await this.prisma.$transaction([
      this.prisma.academicYear.count({ where }),
      this.prisma.academicYear.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
      }),
    ]);

    return {
      items: academicYears.map(toAcademicYearResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findCurrent(schoolId: string): Promise<AcademicYearResponse> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true, status: 'ACTIVE' },
    });

    if (!academicYear) {
      throw new AppException(
        'CURRENT_ACADEMIC_YEAR_REQUIRED',
        'Chưa có năm học hiện hành',
        HttpStatus.NOT_FOUND,
      );
    }

    return toAcademicYearResponse(academicYear);
  }

  async findById(
    schoolId: string,
    academicYearId: string,
  ): Promise<AcademicYearResponse> {
    const academicYear = await this.findAcademicYearInTenant(
      schoolId,
      academicYearId,
    );
    return toAcademicYearResponse(academicYear);
  }

  async create(
    schoolId: string,
    input: CreateAcademicYearInput,
  ): Promise<AcademicYearResponse> {
    validateDateRangeOrThrow(input.startDate, input.endDate);

    try {
      const academicYear = await this.prisma.$transaction(
        async (tx: PrismaTransactionClient) => {
          if (input.isCurrent) {
            await this.clearCurrentAcademicYear(tx, schoolId);
            await this.clearCurrentSemesters(tx, schoolId);
          }

          return tx.academicYear.create({
            data: {
              schoolId,
              name: input.name,
              code: input.code,
              startDate: parseIsoDate(input.startDate),
              endDate: parseIsoDate(input.endDate),
              isCurrent: input.isCurrent,
            },
          });
        },
      );

      return toAcademicYearResponse(academicYear);
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async update(
    schoolId: string,
    academicYearId: string,
    input: UpdateAcademicYearInput,
  ): Promise<AcademicYearResponse> {
    const existing = await this.findAcademicYearInTenant(
      schoolId,
      academicYearId,
    );

    const startDate = input.startDate ?? toIsoDateString(existing.startDate);
    const endDate = input.endDate ?? toIsoDateString(existing.endDate);
    validateDateRangeOrThrow(startDate, endDate);

    try {
      const academicYear = await this.prisma.$transaction(
        async (tx: PrismaTransactionClient) => {
          if (input.isCurrent === true) {
            await this.clearCurrentAcademicYear(tx, schoolId, academicYearId);
            await this.clearCurrentSemesters(tx, schoolId);
          }

          return tx.academicYear.update({
            where: { id: academicYearId },
            data: {
              ...(input.name !== undefined ? { name: input.name } : {}),
              ...(input.code !== undefined ? { code: input.code } : {}),
              ...(input.startDate !== undefined
                ? { startDate: parseIsoDate(input.startDate) }
                : {}),
              ...(input.endDate !== undefined
                ? { endDate: parseIsoDate(input.endDate) }
                : {}),
              ...(input.isCurrent !== undefined
                ? { isCurrent: input.isCurrent }
                : {}),
            },
          });
        },
      );

      return toAcademicYearResponse(academicYear);
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async setCurrent(
    schoolId: string,
    academicYearId: string,
  ): Promise<AcademicYearResponse> {
    await this.findAcademicYearInTenant(schoolId, academicYearId);

    const academicYear = await this.prisma.$transaction(
      async (tx: PrismaTransactionClient) => {
        await this.clearCurrentAcademicYear(tx, schoolId);
        await this.clearCurrentSemesters(tx, schoolId);

        return tx.academicYear.update({
          where: { id: academicYearId },
          data: { isCurrent: true, status: 'ACTIVE' },
        });
      },
    );

    return toAcademicYearResponse(academicYear);
  }

  async updateStatus(
    schoolId: string,
    academicYearId: string,
    input: UpdateAcademicYearStatusInput,
  ): Promise<AcademicYearResponse> {
    await this.findAcademicYearInTenant(schoolId, academicYearId);

    const academicYear = await this.prisma.$transaction(
      async (tx: PrismaTransactionClient) => {
        if (input.status === 'INACTIVE') {
          await this.assertAcademicYearHasNoClasses(
            tx,
            schoolId,
            academicYearId,
          );
        }

        const updated = await tx.academicYear.update({
          where: { id: academicYearId },
          data: {
            status: input.status,
            ...(input.status === 'INACTIVE' ? { isCurrent: false } : {}),
          },
        });

        if (input.status === 'INACTIVE') {
          await tx.semester.updateMany({
            where: { schoolId, academicYearId },
            data: { isCurrent: false },
          });
        }

        return updated;
      },
    );

    return toAcademicYearResponse(academicYear);
  }

  async findAcademicYearInTenant(
    schoolId: string,
    academicYearId: string,
  ): Promise<AcademicYear> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    });

    if (!academicYear) {
      throw new AppException(
        'ACADEMIC_YEAR_NOT_FOUND',
        'Không tìm thấy năm học',
        HttpStatus.NOT_FOUND,
      );
    }

    return academicYear;
  }

  private async clearCurrentAcademicYear(
    tx: PrismaTransactionClient,
    schoolId: string,
    exceptAcademicYearId?: string,
  ): Promise<void> {
    await tx.academicYear.updateMany({
      where: {
        schoolId,
        isCurrent: true,
        ...(exceptAcademicYearId ? { id: { not: exceptAcademicYearId } } : {}),
      },
      data: { isCurrent: false },
    });
  }

  private async clearCurrentSemesters(
    tx: PrismaTransactionClient,
    schoolId: string,
  ): Promise<void> {
    await tx.semester.updateMany({
      where: { schoolId, isCurrent: true },
      data: { isCurrent: false },
    });
  }

  private async assertAcademicYearHasNoClasses(
    tx: PrismaTransactionClient,
    schoolId: string,
    academicYearId: string,
  ): Promise<void> {
    const [homeroomClassCount, courseSectionCount] = await Promise.all([
      tx.homeroomClass.count({ where: { schoolId, academicYearId } }),
      tx.courseSection.count({ where: { schoolId, academicYearId } }),
    ]);

    if (homeroomClassCount > 0 || courseSectionCount > 0) {
      throw new AppException(
        'ACADEMIC_YEAR_HAS_CLASSES',
        'Không thể ngừng hoạt động năm học đang có lớp',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private handleUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'ACADEMIC_YEAR_CODE_EXISTS',
        'Mã năm học đã tồn tại trong trường',
        HttpStatus.CONFLICT,
      );
    }
  }
}
