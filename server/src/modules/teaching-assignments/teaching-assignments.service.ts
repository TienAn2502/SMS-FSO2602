import { HttpStatus, Injectable } from '@nestjs/common';
import { AcademicEntityStatus, Prisma } from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../common/database/prisma.service';
import { parseIsoDate, toIsoDateString } from '../../common/schemas/academic.schema';
import type { PaginationMeta } from '../../common/types/api-response.types';
import {
  buildPaginationMeta,
  getSkip,
} from '../../common/utils/pagination.util';
import { CourseSectionsService } from '../course-sections/course-sections.service';
import { SemestersService } from '../semesters/semesters.service';
import { TeachersService } from '../teachers/teachers.service';
import {
  teachingAssignmentInclude,
  toTeachingAssignmentResponse,
  type TeachingAssignmentResponse,
} from './mappers/teaching-assignment.mapper';
import type {
  CreateTeachingAssignmentInput,
  ListTeachingAssignmentsQuery,
  UpdateTeachingAssignmentStatusInput,
} from './schemas/teaching-assignment.schema';

@Injectable()
export class TeachingAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teachersService: TeachersService,
    private readonly courseSectionsService: CourseSectionsService,
    private readonly semestersService: SemestersService,
  ) {}

  async list(
    schoolId: string,
    query: ListTeachingAssignmentsQuery,
  ): Promise<{ items: TeachingAssignmentResponse[]; meta: PaginationMeta }> {
    const courseSectionFilter = await this.resolveCourseSectionFilter(
      schoolId,
      query,
    );

    const where: Prisma.TeachingAssignmentWhereInput = {
      schoolId,
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.courseSectionId
        ? { courseSectionId: query.courseSectionId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(courseSectionFilter
        ? { courseSection: courseSectionFilter }
        : {}),
    };

    const orderBy: Prisma.TeachingAssignmentOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [total, assignments] = await this.prisma.$transaction([
      this.prisma.teachingAssignment.count({ where }),
      this.prisma.teachingAssignment.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
        include: teachingAssignmentInclude,
      }),
    ]);

    return {
      items: assignments.map(toTeachingAssignmentResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async listByTeacher(
    schoolId: string,
    teacherId: string,
    query: ListTeachingAssignmentsQuery,
  ): Promise<{ items: TeachingAssignmentResponse[]; meta: PaginationMeta }> {
    await this.teachersService.findTeacherInTenant(schoolId, teacherId);

    return this.list(schoolId, {
      ...query,
      teacherId,
    });
  }

  async findById(
    schoolId: string,
    assignmentId: string,
  ): Promise<TeachingAssignmentResponse> {
    const assignment = await this.findAssignmentInTenant(
      schoolId,
      assignmentId,
    );
    return toTeachingAssignmentResponse(assignment);
  }

  async create(
    schoolId: string,
    input: CreateTeachingAssignmentInput,
  ): Promise<TeachingAssignmentResponse> {
    const teacher = await this.teachersService.findTeacherInTenant(
      schoolId,
      input.teacherId,
    );

    if (teacher.status !== AcademicEntityStatus.ACTIVE) {
      throw new AppException(
        'TEACHER_NOT_FOUND',
        'Giáo viên không hoạt động',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const courseSection =
      await this.courseSectionsService.findCourseSectionInTenant(
        schoolId,
        input.courseSectionId,
      );

    if (courseSection.status !== AcademicEntityStatus.ACTIVE) {
      throw new AppException(
        'COURSE_SECTION_NOT_FOUND',
        'Lớp môn học không hoạt động',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const existing = await this.prisma.teachingAssignment.findUnique({
      where: {
        teacherId_courseSectionId: {
          teacherId: input.teacherId,
          courseSectionId: input.courseSectionId,
        },
      },
    });

    if (existing) {
      if (existing.status === AcademicEntityStatus.ACTIVE) {
        throw new AppException(
          'ASSIGNMENT_ALREADY_EXISTS',
          'Giáo viên đã được phân công lớp môn này',
          HttpStatus.CONFLICT,
        );
      }

      const reactivated = await this.prisma.teachingAssignment.update({
        where: { id: existing.id },
        data: {
          status: AcademicEntityStatus.ACTIVE,
          assignAt: parseIsoDate(input.assignAt),
          endAt: null,
        },
        include: teachingAssignmentInclude,
      });

      return toTeachingAssignmentResponse(reactivated);
    }

    try {
      const assignment = await this.prisma.teachingAssignment.create({
        data: {
          schoolId,
          teacherId: input.teacherId,
          courseSectionId: input.courseSectionId,
          assignAt: parseIsoDate(input.assignAt),
          status: AcademicEntityStatus.ACTIVE,
        },
        include: teachingAssignmentInclude,
      });

      return toTeachingAssignmentResponse(assignment);
    } catch (error: unknown) {
      this.handleAssignmentConflict(error);
      throw error;
    }
  }

  async updateStatus(
    schoolId: string,
    assignmentId: string,
    input: UpdateTeachingAssignmentStatusInput,
  ): Promise<TeachingAssignmentResponse> {
    const assignment = await this.findAssignmentInTenant(
      schoolId,
      assignmentId,
    );

    if (assignment.status === input.status) {
      return toTeachingAssignmentResponse(assignment);
    }

    const endAt =
      input.status === AcademicEntityStatus.INACTIVE
        ? parseIsoDate(input.endAt ?? toIsoDateString(new Date()))
        : null;

    const updated = await this.prisma.teachingAssignment.update({
      where: { id: assignmentId },
      data: {
        status: input.status,
        endAt,
      },
      include: teachingAssignmentInclude,
    });

    return toTeachingAssignmentResponse(updated);
  }

  private async findAssignmentInTenant(
    schoolId: string,
    assignmentId: string,
  ) {
    const assignment = await this.prisma.teachingAssignment.findFirst({
      where: { id: assignmentId, schoolId },
      include: teachingAssignmentInclude,
    });

    if (!assignment) {
      throw new AppException(
        'ASSIGNMENT_NOT_FOUND',
        'Không tìm thấy phân công',
        HttpStatus.NOT_FOUND,
      );
    }

    return assignment;
  }

  private async resolveCourseSectionFilter(
    schoolId: string,
    query: ListTeachingAssignmentsQuery,
  ): Promise<Prisma.CourseSectionWhereInput | undefined> {
    if (query.includeAllSemesters) {
      if (query.semesterId) {
        return { semesterId: query.semesterId };
      }

      if (query.academicYearId) {
        return {
          semester: {
            academicYearId: query.academicYearId,
          },
        };
      }

      return undefined;
    }

    if (query.semesterId) {
      return { semesterId: query.semesterId };
    }

    if (query.academicYearId) {
      return {
        semester: {
          academicYearId: query.academicYearId,
        },
      };
    }

    const currentSemester =
      await this.semestersService.findCurrentForSchool(schoolId);

    return { semesterId: currentSemester.id };
  }

  private handleAssignmentConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'ASSIGNMENT_ALREADY_EXISTS',
        'Giáo viên đã được phân công lớp môn này',
        HttpStatus.CONFLICT,
      );
    }
  }
}
