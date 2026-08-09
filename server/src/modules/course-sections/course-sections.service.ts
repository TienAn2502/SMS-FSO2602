import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcademicEntityStatus,
  Prisma,
  type CourseSection,
  type GradeLevelSubject,
  type HomeroomClass,
  type Semester,
} from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import type { PaginationMeta } from '@/common/types/api-response.types';
import {
  buildPaginationMeta,
  getSkip,
} from '@/common/utils/pagination.util';
import { GradeLevelsService } from '@/modules/grade-levels/grade-levels.service';
import { HomeroomClassesService } from '@/modules/homeroom-classes/homeroom-classes.service';
import { SubjectsService } from '@/modules/subjects/subjects.service';
import {
  courseSectionInclude,
  toCourseSectionResponse,
  type CourseSectionResponse,
} from '@/modules/course-sections/mappers/course-section.mapper';
import type {
  CopySemesterCourseSectionsInput,
  CreateCourseSectionInput,
  ListCourseSectionsQuery,
  UpdateCourseSectionInput,
  UpdateCourseSectionStatusInput,
} from '@/modules/course-sections/schemas/course-section.schema';
import {
  ALL_ACADEMIC_PERIODS,
  isSemesterUuid,
} from '@/modules/course-sections/schemas/course-section.schema';
import { SemestersService } from '@/modules/semesters/semesters.service';

@Injectable()
export class CourseSectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gradeLevelsService: GradeLevelsService,
    private readonly homeroomClassesService: HomeroomClassesService,
    private readonly subjectsService: SubjectsService,
    private readonly semestersService: SemestersService,
  ) {}

  async list(
    schoolId: string,
    query: ListCourseSectionsQuery,
  ): Promise<{ items: CourseSectionResponse[]; meta: PaginationMeta }> {
    return this.listWithWhere(
      schoolId,
      query,
      await this.buildListWhere(schoolId, query),
    );
  }

  async listForStudentEnrollments(
    schoolId: string,
    enrollmentScopes: Array<{ homeroomClassId: string; semesterId: string }>,
    query: ListCourseSectionsQuery,
  ): Promise<{ items: CourseSectionResponse[]; meta: PaginationMeta }> {
    if (enrollmentScopes.length === 0) {
      return {
        items: [],
        meta: buildPaginationMeta(query.page, query.limit, 0),
      };
    }

    const baseWhere = await this.buildListWhere(schoolId, query);

    return this.listWithWhere(schoolId, query, {
      ...baseWhere,
      AND: [
        ...(Array.isArray(baseWhere.AND)
          ? baseWhere.AND
          : baseWhere.AND
            ? [baseWhere.AND]
            : []),
        {
          OR: enrollmentScopes.map(({ homeroomClassId, semesterId }) => ({
            homeroomClassId,
            semesterId,
          })),
        },
      ],
    });
  }

  private async buildListWhere(
    schoolId: string,
    query: ListCourseSectionsQuery,
  ): Promise<Prisma.CourseSectionWhereInput> {
    const semesterFilter = await this.resolveSemesterFilter(schoolId, query);

    return {
      schoolId,
      ...(query.status ? { status: query.status } : {}),
      ...semesterFilter,
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
  }

  private async listWithWhere(
    schoolId: string,
    query: ListCourseSectionsQuery,
    where: Prisma.CourseSectionWhereInput,
  ): Promise<{ items: CourseSectionResponse[]; meta: PaginationMeta }> {
    void schoolId;

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
        include: courseSectionInclude,
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

  async copyFromSemester(
    schoolId: string,
    input: CopySemesterCourseSectionsInput,
  ): Promise<{
    sourceSemesterId: string;
    targetSemesterId: string;
    sourceSemesterCode: string;
    targetSemesterCode: string;
    sourceActiveCount: number;
    createdCount: number;
    skippedCount: number;
  }> {
    if (input.sourceSemesterId === input.targetSemesterId) {
      throw new AppException(
        'COURSE_SECTION_COPY_SAME_SEMESTER',
        'Học kỳ nguồn và học kỳ đích phải khác nhau',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const sourceSemester = await this.semestersService.findSemesterInTenantById(
      schoolId,
      input.sourceSemesterId,
    );
    const targetSemester = await this.semestersService.findSemesterInTenantById(
      schoolId,
      input.targetSemesterId,
    );

    if (sourceSemester.academicYearId !== targetSemester.academicYearId) {
      throw new AppException(
        'TENANT_MISMATCH',
        'Hai học kỳ phải thuộc cùng năm học',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const sourceSections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        semesterId: input.sourceSemesterId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        homeroomClassId: true,
        gradeLevelSubjectId: true,
        name: true,
        code: true,
      },
      orderBy: { code: 'asc' },
    });

    if (sourceSections.length === 0) {
      throw new AppException(
        'NO_SOURCE_COURSE_SECTIONS',
        'Không có lớp môn đang hoạt động (ACTIVE) ở học kỳ nguồn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const existingTargetSections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        semesterId: input.targetSemesterId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        homeroomClassId: true,
        gradeLevelSubjectId: true,
        code: true,
      },
    });

    const skipByClassSubject = new Set(
      existingTargetSections
        .filter((section) => section.homeroomClassId)
        .map(
          (section) =>
            `${section.homeroomClassId}:${section.gradeLevelSubjectId}`,
        ),
    );
    const skipByCode = new Set(
      existingTargetSections.map((section) => section.code),
    );

    const toCreate = sourceSections.filter((source) => {
      if (
        source.homeroomClassId &&
        skipByClassSubject.has(
          `${source.homeroomClassId}:${source.gradeLevelSubjectId}`,
        )
      ) {
        return false;
      }

      return !skipByCode.has(source.code);
    });
    const skippedCount = sourceSections.length - toCreate.length;

    let createdCount = 0;

    if (toCreate.length > 0) {
      const result = await this.prisma.courseSection.createMany({
        data: toCreate.map((source) => ({
          schoolId,
          semesterId: input.targetSemesterId,
          homeroomClassId: source.homeroomClassId,
          gradeLevelSubjectId: source.gradeLevelSubjectId,
          name: source.name,
          code: source.code,
          status: AcademicEntityStatus.ACTIVE,
        })),
      });
      createdCount = result.count;
    }

    return {
      sourceSemesterId: sourceSemester.id,
      targetSemesterId: targetSemester.id,
      sourceSemesterCode: sourceSemester.code,
      targetSemesterCode: targetSemester.code,
      sourceActiveCount: sourceSections.length,
      createdCount,
      skippedCount,
    };
  }

  async create(
    schoolId: string,
    input: CreateCourseSectionInput,
  ): Promise<CourseSectionResponse> {
    const semester = await this.findSemesterInTenant(
      schoolId,
      input.semesterId,
    );
    await this.subjectsService.findSubjectInTenant(schoolId, input.subjectId);

    const homeroomClass = input.homeroomClassId
      ? await this.validateHomeroomClassForYear(
          schoolId,
          input.homeroomClassId,
          semester.academicYearId,
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
          semesterId: semester.id,
          homeroomClassId: input.homeroomClassId ?? null,
          gradeLevelSubjectId: gradeLevelSubject.id,
          name: input.name,
          code: input.code,
        },
        include: courseSectionInclude,
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
        existing.semester.academicYearId,
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
        include: courseSectionInclude,
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
      include: courseSectionInclude,
    });

    return toCourseSectionResponse(courseSection);
  }

  async findCourseSectionInTenant(
    schoolId: string,
    courseSectionId: string,
  ): Promise<CourseSection & { semester: Pick<Semester, 'academicYearId'> }> {
    const courseSection = await this.prisma.courseSection.findFirst({
      where: { id: courseSectionId, schoolId },
      include: courseSectionInclude,
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

  private async findSemesterInTenant(
    schoolId: string,
    semesterId: string,
  ): Promise<Semester> {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, schoolId },
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
        'Lớp hành chính không thuộc năm học của học kỳ đã chọn',
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

  private async resolveSemesterFilter(
    schoolId: string,
    query: ListCourseSectionsQuery,
  ): Promise<Prisma.CourseSectionWhereInput> {
    if (query.semesterId && query.semesterId !== ALL_ACADEMIC_PERIODS) {
      if (isSemesterUuid(query.semesterId)) {
        return { semesterId: query.semesterId };
      }

      return {
        semester: {
          schoolId,
          code: query.semesterId,
          ...(query.academicYearId &&
          query.academicYearId !== ALL_ACADEMIC_PERIODS
            ? { academicYearId: query.academicYearId }
            : {}),
        },
      };
    }

    if (query.academicYearId && query.academicYearId !== ALL_ACADEMIC_PERIODS) {
      return {
        semester: {
          academicYearId: query.academicYearId,
        },
      };
    }

    if (
      query.academicYearId === ALL_ACADEMIC_PERIODS ||
      query.semesterId === ALL_ACADEMIC_PERIODS
    ) {
      return {};
    }

    const currentSemester =
      await this.semestersService.findCurrentForSchool(schoolId);

    return { semesterId: currentSemester.id };
  }

  private handleUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'COURSE_SECTION_CODE_EXISTS',
        'Mã lớp môn học đã tồn tại trong học kỳ',
        HttpStatus.CONFLICT,
      );
    }
  }
}
