import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type Semester } from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../common/database/prisma.service';
import type { PrismaTransactionClient } from '../../common/database/prisma-transaction.type';
import {
  parseIsoDate,
  toIsoDateString,
} from '../../common/schemas/academic.schema';
import { validateDateRangeOrThrow } from '../../common/utils/date-range.util';
import { AcademicYearsService } from '../academic-years/academic-years.service';
import {
  toSemesterResponse,
  type SemesterResponse,
} from './mappers/semester.mapper';
import type {
  CreateSemesterInput,
  UpdateSemesterInput,
  UpdateSemesterStatusInput,
} from './schemas/semester.schema';

@Injectable()
export class SemestersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicYearsService: AcademicYearsService,
  ) {}

  async list(
    schoolId: string,
    academicYearId: string,
  ): Promise<SemesterResponse[]> {
    await this.academicYearsService.findAcademicYearInTenant(
      schoolId,
      academicYearId,
    );

    const semesters = await this.prisma.semester.findMany({
      where: { schoolId, academicYearId },
      orderBy: { startDate: 'asc' },
    });

    return semesters.map(toSemesterResponse);
  }

  async findCurrentForSchool(schoolId: string): Promise<SemesterResponse> {
    const semester = await this.prisma.semester.findFirst({
      where: { schoolId, isCurrent: true, status: 'ACTIVE' },
    });

    if (!semester) {
      throw new AppException(
        'CURRENT_SEMESTER_REQUIRED',
        'Chưa có học kỳ hiện hành',
        HttpStatus.NOT_FOUND,
      );
    }

    return toSemesterResponse(semester);
  }

  async findCurrentForYear(
    schoolId: string,
    academicYearId: string,
  ): Promise<SemesterResponse> {
    await this.academicYearsService.findAcademicYearInTenant(
      schoolId,
      academicYearId,
    );

    const semester = await this.prisma.semester.findFirst({
      where: { schoolId, academicYearId, isCurrent: true, status: 'ACTIVE' },
    });

    if (!semester) {
      throw new AppException(
        'CURRENT_SEMESTER_REQUIRED',
        'Chưa có học kỳ hiện hành trong năm học này',
        HttpStatus.NOT_FOUND,
      );
    }

    return toSemesterResponse(semester);
  }

  async findById(
    schoolId: string,
    academicYearId: string,
    semesterId: string,
  ): Promise<SemesterResponse> {
    const semester = await this.findSemesterInTenant(
      schoolId,
      academicYearId,
      semesterId,
    );
    return toSemesterResponse(semester);
  }

  async create(
    schoolId: string,
    academicYearId: string,
    input: CreateSemesterInput,
  ): Promise<SemesterResponse> {
    const academicYear =
      await this.academicYearsService.findAcademicYearInTenant(
        schoolId,
        academicYearId,
      );
    validateDateRangeOrThrow(input.startDate, input.endDate);

    if (input.isCurrent) {
      this.assertAcademicYearIsCurrent(academicYear);
    }

    try {
      const semester = await this.prisma.$transaction(
        async (tx: PrismaTransactionClient) => {
          if (input.isCurrent) {
            await this.clearCurrentSemester(tx, schoolId);
          }

          return tx.semester.create({
            data: {
              schoolId,
              academicYearId,
              name: input.name,
              code: input.code,
              startDate: parseIsoDate(input.startDate),
              endDate: parseIsoDate(input.endDate),
              isCurrent: input.isCurrent,
            },
          });
        },
      );

      return toSemesterResponse(semester);
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async update(
    schoolId: string,
    academicYearId: string,
    semesterId: string,
    input: UpdateSemesterInput,
  ): Promise<SemesterResponse> {
    const existing = await this.findSemesterInTenant(
      schoolId,
      academicYearId,
      semesterId,
    );

    const startDate = input.startDate ?? toIsoDateString(existing.startDate);
    const endDate = input.endDate ?? toIsoDateString(existing.endDate);
    validateDateRangeOrThrow(startDate, endDate);

    if (input.isCurrent === true) {
      const academicYear =
        await this.academicYearsService.findAcademicYearInTenant(
          schoolId,
          academicYearId,
        );
      this.assertAcademicYearIsCurrent(academicYear);
    }

    try {
      const semester = await this.prisma.$transaction(
        async (tx: PrismaTransactionClient) => {
          if (input.isCurrent === true) {
            await this.clearCurrentSemester(tx, schoolId, semesterId);
          }

          return tx.semester.update({
            where: { id: semesterId },
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

      return toSemesterResponse(semester);
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async setCurrent(
    schoolId: string,
    academicYearId: string,
    semesterId: string,
  ): Promise<SemesterResponse> {
    await this.findSemesterInTenant(schoolId, academicYearId, semesterId);

    const academicYear =
      await this.academicYearsService.findAcademicYearInTenant(
        schoolId,
        academicYearId,
      );
    this.assertAcademicYearIsCurrent(academicYear);

    const semester = await this.prisma.$transaction(
      async (tx: PrismaTransactionClient) => {
        await this.clearCurrentSemester(tx, schoolId);

        return tx.semester.update({
          where: { id: semesterId },
          data: { isCurrent: true, status: 'ACTIVE' },
        });
      },
    );

    return toSemesterResponse(semester);
  }

  async updateStatus(
    schoolId: string,
    academicYearId: string,
    semesterId: string,
    input: UpdateSemesterStatusInput,
  ): Promise<SemesterResponse> {
    await this.findSemesterInTenant(schoolId, academicYearId, semesterId);

    const semester = await this.prisma.semester.update({
      where: { id: semesterId },
      data: {
        status: input.status,
        ...(input.status === 'INACTIVE' ? { isCurrent: false } : {}),
      },
    });

    return toSemesterResponse(semester);
  }

  async clearCurrentSemestersForSchool(
    tx: PrismaTransactionClient,
    schoolId: string,
  ): Promise<void> {
    await this.clearCurrentSemester(tx, schoolId);
  }

  private async findSemesterInTenant(
    schoolId: string,
    academicYearId: string,
    semesterId: string,
  ): Promise<Semester> {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, schoolId, academicYearId },
    });

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Không tìm thấy học kỳ',
        HttpStatus.NOT_FOUND,
      );
    }

    return semester;
  }

  private assertAcademicYearIsCurrent(academicYear: {
    isCurrent: boolean;
    status: string;
  }): void {
    if (!academicYear.isCurrent || academicYear.status !== 'ACTIVE') {
      throw new AppException(
        'ACADEMIC_YEAR_NOT_CURRENT',
        'Học kỳ hiện hành chỉ được đặt trong năm học hiện hành',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async clearCurrentSemester(
    tx: PrismaTransactionClient,
    schoolId: string,
    exceptSemesterId?: string,
  ): Promise<void> {
    await tx.semester.updateMany({
      where: {
        schoolId,
        isCurrent: true,
        ...(exceptSemesterId ? { id: { not: exceptSemesterId } } : {}),
      },
      data: { isCurrent: false },
    });
  }

  private handleUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'SEMESTER_CODE_EXISTS',
        'Mã học kỳ đã tồn tại trong năm học',
        HttpStatus.CONFLICT,
      );
    }
  }
}
