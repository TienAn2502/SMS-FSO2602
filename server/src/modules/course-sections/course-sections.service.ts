import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcademicEntityStatus,
  Prisma,
  type CourseSection,
  type GradeLevelSubject,
  type HomeroomClass,
} from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../common/database/prisma.service';
import type { PaginationMeta } from '../../common/types/api-response.types';
import {
  buildPaginationMeta,
  getSkip,
} from '../../common/utils/pagination.util';
import { AcademicYearsService } from '../academic-years/academic-years.service';
import { GradeLevelsService } from '../grade-levels/grade-levels.service';
import { HomeroomClassesService } from '../homeroom-classes/homeroom-classes.service';
import { SubjectsService } from '../subjects/subjects.service';
import {
  toCourseSectionResponse,
  type CourseSectionResponse,
} from './mappers/course-section.mapper';
import type {
  CreateCourseSectionInput,
  ListCourseSectionsQuery,
  UpdateCourseSectionInput,
  UpdateCourseSectionStatusInput,
} from './schemas/course-section.schema';

@Injectable()
export class CourseSectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academicYearsService: AcademicYearsService,
    private readonly gradeLevelsService: GradeLevelsService,
    private readonly homeroomClassesService: HomeroomClassesService,
    private readonly subjectsService: SubjectsService,
  ) {}

  async list(
    schoolId: string,
    query: ListCourseSectionsQuery,
  ): Promise<{ items: CourseSectionResponse[]; meta: PaginationMeta }> {
    const where: Prisma.CourseSectionWhereInput = {
      schoolId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
      ...(query.homeroomClassId
        ? { homeroomClassId: query.homeroomClassId }
        : {}),
      ...(query.subjectId
        ? {
            gradeLevelSubject: {
              subjectId: query.subjectId,
            },
          }
        : {}),
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

    const orderBy: Prisma.CourseSectionOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [total, courseSections] = await this.prisma.$transaction([
      this.prisma.courseSection.count({ where }),
      this.prisma.courseSection.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
      }),
    ]);

    return {
      items: courseSections.map(toCourseSectionResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(
    schoolId: string,
    courseSectionId: string,
  ): Promise<CourseSectionResponse> {
    const courseSection = await this.findCourseSectionInTenant(
      schoolId,
      courseSectionId,
    );
    return toCourseSectionResponse(courseSection);
  }

  async create(
    schoolId: string,
    input: CreateCourseSectionInput,
  ): Promise<CourseSectionResponse> {
    await this.academicYearsService.findAcademicYearInTenant(
      schoolId,
      input.academicYearId,
    );
    await this.subjectsService.findSubjectInTenant(schoolId, input.subjectId);

    const homeroomClass = input.homeroomClassId
      ? await this.validateHomeroomClassForYear(
          schoolId,
          input.homeroomClassId,
          input.academicYearId,
        )
      : null;

    const gradeLevelId = homeroomClass
      ? homeroomClass.gradeLevelId
      : await this.resolveGradeLevelId(schoolId, input.gradeLevelId);

    const gradeLevelSubject = await this.findGradeLevelSubject(
      schoolId,
      gradeLevelId,
      input.subjectId,
    );

    if (
      homeroomClass &&
      homeroomClass.gradeLevelId !== gradeLevelSubject.gradeLevelId
    ) {
      throw new AppException(
        'TENANT_MISMATCH',
        'Môn học không thuộc khối của lớp hành chính',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    try {
      const courseSection = await this.prisma.courseSection.create({
        data: {
          schoolId,
          academicYearId: input.academicYearId,
          homeroomClassId: input.homeroomClassId ?? null,
          gradeLevelSubjectId: gradeLevelSubject.id,
          name: input.name,
          code: input.code,
        },
      });

      return toCourseSectionResponse(courseSection);
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async update(
    schoolId: string,
    courseSectionId: string,
    input: UpdateCourseSectionInput,
  ): Promise<CourseSectionResponse> {
    const existing = await this.findCourseSectionInTenant(
      schoolId,
      courseSectionId,
    );

    if (input.homeroomClassId !== undefined && input.homeroomClassId !== null) {
      const homeroomClass = await this.validateHomeroomClassForYear(
        schoolId,
        input.homeroomClassId,
        existing.academicYearId,
      );

      const gradeLevelSubject = await this.prisma.gradeLevelSubject.findFirst({
        where: {
          id: existing.gradeLevelSubjectId,
          schoolId,
        },
      });

      if (
        !gradeLevelSubject ||
        homeroomClass.gradeLevelId !== gradeLevelSubject.gradeLevelId
      ) {
        throw new AppException(
          'TENANT_MISMATCH',
          'Môn học không thuộc khối của lớp hành chính',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    try {
      const courseSection = await this.prisma.courseSection.update({
        where: { id: courseSectionId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.homeroomClassId !== undefined
            ? { homeroomClassId: input.homeroomClassId }
            : {}),
        },
      });

      return toCourseSectionResponse(courseSection);
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async updateStatus(
    schoolId: string,
    courseSectionId: string,
    input: UpdateCourseSectionStatusInput,
  ): Promise<CourseSectionResponse> {
    await this.findCourseSectionInTenant(schoolId, courseSectionId);

    const courseSection = await this.prisma.courseSection.update({
      where: { id: courseSectionId },
      data: { status: input.status },
    });

    return toCourseSectionResponse(courseSection);
  }

  async findCourseSectionInTenant(
    schoolId: string,
    courseSectionId: string,
  ): Promise<CourseSection> {
    const courseSection = await this.prisma.courseSection.findFirst({
      where: { id: courseSectionId, schoolId },
    });

    if (!courseSection) {
      throw new AppException(
        'COURSE_SECTION_NOT_FOUND',
        'Không tìm thấy lớp môn học',
        HttpStatus.NOT_FOUND,
      );
    }

    return courseSection;
  }

  private async validateHomeroomClassForYear(
    schoolId: string,
    homeroomClassId: string,
    academicYearId: string,
  ): Promise<HomeroomClass> {
    const homeroomClass =
      await this.homeroomClassesService.findHomeroomClassInTenant(
        schoolId,
        homeroomClassId,
      );

    if (homeroomClass.academicYearId !== academicYearId) {
      throw new AppException(
        'TENANT_MISMATCH',
        'Lớp hành chính không thuộc năm học đã chọn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return homeroomClass;
  }

  private async resolveGradeLevelId(
    schoolId: string,
    gradeLevelId: string | undefined,
  ): Promise<string> {
    if (!gradeLevelId) {
      throw new AppException(
        'GRADE_LEVEL_NOT_FOUND',
        'Không tìm thấy khối',
        HttpStatus.NOT_FOUND,
      );
    }

    const gradeLevel = await this.gradeLevelsService.findGradeLevelInTenant(
      schoolId,
      gradeLevelId,
    );

    return gradeLevel.id;
  }

  private async findGradeLevelSubject(
    schoolId: string,
    gradeLevelId: string,
    subjectId: string,
  ): Promise<GradeLevelSubject> {
    const gradeLevelSubject = await this.prisma.gradeLevelSubject.findFirst({
      where: {
        schoolId,
        gradeLevelId,
        subjectId,
        status: AcademicEntityStatus.ACTIVE,
      },
    });

    if (!gradeLevelSubject) {
      throw new AppException(
        'GRADE_LEVEL_SUBJECT_NOT_FOUND',
        'Môn học chưa được cấu hình cho khối này',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return gradeLevelSubject;
  }

  private handleUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'COURSE_SECTION_CODE_EXISTS',
        'Mã lớp môn học đã tồn tại trong năm học',
        HttpStatus.CONFLICT,
      );
    }
  }
}
