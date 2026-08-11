import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Prisma,
  type HomeroomClass,
  AcademicEntityStatus,
} from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import type { PaginationMeta } from '@/common/types/api-response.types';
import {
  buildPaginationMeta,
  getSkip,
} from '@/common/utils/pagination.util';
import { AcademicYearsService } from '@/modules/academic-years/academic-years.service';
import { GradeLevelsService } from '@/modules/grade-levels/grade-levels.service';
import {
  toHomeroomClassResponse,
  type HomeroomClassResponse,
} from '@/modules/homeroom-classes/mappers/homeroom-class.mapper';
import type {
  CreateHomeroomClassInput,
  ListHomeroomClassesQuery,
  UpdateHomeroomClassInput,
  UpdateHomeroomClassStatusInput,
} from '@/modules/homeroom-classes/schemas/homeroom-class.schema';

@Injectable()
export class HomeroomClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicYearsService: AcademicYearsService,
    private readonly gradeLevelsService: GradeLevelsService,
  ) {}

  async list(
    schoolId: string,
    query: ListHomeroomClassesQuery,
  ): Promise<{ items: HomeroomClassResponse[]; meta: PaginationMeta }> {
    const where: Prisma.HomeroomClassWhereInput = {
      schoolId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
      ...(query.gradeLevelId ? { gradeLevelId: query.gradeLevelId } : {}),
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

    const orderBy: Prisma.HomeroomClassOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [total, homeroomClasses] = await this.prisma.$transaction([
      this.prisma.homeroomClass.count({ where }),
      this.prisma.homeroomClass.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
      }),
    ]);

    return {
      items: homeroomClasses.map(toHomeroomClassResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(
    schoolId: string,
    homeroomClassId: string,
  ): Promise<HomeroomClassResponse> {
    const homeroomClass = await this.findHomeroomClassInTenant(
      schoolId,
      homeroomClassId,
    );
    return toHomeroomClassResponse(homeroomClass);
  }

  async create(
    schoolId: string,
    input: CreateHomeroomClassInput,
  ): Promise<HomeroomClassResponse> {
    await this.academicYearsService.findAcademicYearInTenant(
      schoolId,
      input.academicYearId,
    );
    await this.gradeLevelsService.findGradeLevelInTenant(
      schoolId,
      input.gradeLevelId,
    );

    if (input.homeroomTeacherId) {
      await this.validateHomeroomTeacher(
        schoolId,
        input.homeroomTeacherId,
        input.academicYearId,
      );
    }

    try {
      const homeroomClass = await this.prisma.homeroomClass.create({
        data: {
          schoolId,
          academicYearId: input.academicYearId,
          gradeLevelId: input.gradeLevelId,
          name: input.name,
          code: input.code,
          capacity: input.capacity ?? null,
          homeroomTeacherId: input.homeroomTeacherId ?? null,
        },
      });

      return toHomeroomClassResponse(homeroomClass);
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async update(
    schoolId: string,
    homeroomClassId: string,
    input: UpdateHomeroomClassInput,
  ): Promise<HomeroomClassResponse> {
    const existing = await this.findHomeroomClassInTenant(
      schoolId,
      homeroomClassId,
    );

    if (input.homeroomTeacherId) {
      await this.validateHomeroomTeacher(
        schoolId,
        input.homeroomTeacherId,
        existing.academicYearId,
        homeroomClassId,
      );
    }

    try {
      const homeroomClass = await this.prisma.homeroomClass.update({
        where: { id: homeroomClassId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
          ...(input.homeroomTeacherId !== undefined
            ? { homeroomTeacherId: input.homeroomTeacherId }
            : {}),
        },
      });

      return toHomeroomClassResponse(homeroomClass);
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async updateStatus(
    schoolId: string,
    homeroomClassId: string,
    input: UpdateHomeroomClassStatusInput,
  ): Promise<HomeroomClassResponse> {
    await this.findHomeroomClassInTenant(schoolId, homeroomClassId);

    const homeroomClass = await this.prisma.homeroomClass.update({
      where: { id: homeroomClassId },
      data: { status: input.status },
    });

    return toHomeroomClassResponse(homeroomClass);
  }

  async findHomeroomClassInTenant(
    schoolId: string,
    homeroomClassId: string,
  ): Promise<HomeroomClass> {
    const homeroomClass = await this.prisma.homeroomClass.findFirst({
      where: { id: homeroomClassId, schoolId },
    });

    if (!homeroomClass) {
      throw new AppException(
        'HOMEROOM_CLASS_NOT_FOUND',
        'Không tìm thấy lớp hành chính',
        HttpStatus.NOT_FOUND,
      );
    }

    return homeroomClass;
  }

  private async validateHomeroomTeacher(
    schoolId: string,
    teacherId: string,
    academicYearId: string,
    excludeHomeroomClassId?: string,
  ): Promise<void> {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
        status: AcademicEntityStatus.ACTIVE,
      },
    });

    if (!teacher) {
      throw new AppException(
        'INVALID_HOMEROOM_TEACHER',
        'Giáo viên không hợp lệ',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const existingHomeroom = await this.prisma.homeroomClass.findFirst({
      where: {
        schoolId,
        academicYearId,
        homeroomTeacherId: teacherId,
        status: AcademicEntityStatus.ACTIVE,
        ...(excludeHomeroomClassId
          ? { id: { not: excludeHomeroomClassId } }
          : {}),
      },
      select: { id: true, code: true },
    });

    if (existingHomeroom) {
      throw new AppException(
        'HOMEROOM_TEACHER_ALREADY_ASSIGNED',
        `Giáo viên đã là GVCN lớp ${existingHomeroom.code} trong năm học này`,
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
        'HOMEROOM_CLASS_CODE_EXISTS',
        'Mã lớp hành chính đã tồn tại trong năm học',
        HttpStatus.CONFLICT,
      );
    }
  }
}
