import { HttpStatus, Injectable } from '@nestjs/common';
import { AcademicEntityStatus, Prisma } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import {
  parseIsoDate,
  toIsoDateString,
} from '@/common/schemas/academic.schema';
import type { PaginationMeta } from '@/common/types/api-response.types';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import { CourseSectionsService } from '@/modules/course-sections/course-sections.service';
import { SemestersService } from '@/modules/semesters/semesters.service';
import { TeachersService } from '@/modules/teachers/teachers.service';
import {
  teachingAssignmentInclude,
  toTeachingAssignmentResponse,
  type TeachingAssignmentResponse,
} from '@/modules/teaching-assignments/mappers/teaching-assignment.mapper';
import type {
  CopySemesterTeachingAssignmentsInput,
  CreateTeachingAssignmentInput,
  ListTeachingAssignmentsQuery,
  UpdateTeachingAssignmentStatusInput,
} from '@/modules/teaching-assignments/schemas/teaching-assignment.schema';

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
      ...(query.search
        ? {
            OR: [
              {
                teacher: {
                  fullName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                courseSection: {
                  code: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                courseSection: {
                  name: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
      ...(courseSectionFilter ? { courseSection: courseSectionFilter } : {}),
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

  /**
   * Sao chép phân công giảng dạy HK nguồn → HK đích (vd. HK1 → HK2).
   * Giả định: lớp môn HK đích đã được tạo trước (copy course-sections) với cùng mã.
   * Mỗi lớp môn chỉ có tối đa một GV ACTIVE; HK nguồn không bị đóng.
   */
  async copyFromSemester(
    schoolId: string,
    input: CopySemesterTeachingAssignmentsInput,
  ): Promise<{
    sourceSemesterId: string;
    targetSemesterId: string;
    sourceSemesterCode: string;
    targetSemesterCode: string;
    sourceActiveCount: number;
    createdCount: number;
    skippedCount: number;
  }> {
    // --- Kiểm tra đầu vào ---
    if (input.sourceSemesterId === input.targetSemesterId) {
      throw new AppException(
        'ASSIGNMENT_COPY_SAME_SEMESTER',
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

    // Hai HK phải cùng năm học (vd. HK1 và HK2 của 2025-2026)
    if (sourceSemester.academicYearId !== targetSemester.academicYearId) {
      throw new AppException(
        'TENANT_MISMATCH',
        'Hai học kỳ phải thuộc cùng năm học',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // --- Lấy danh sách phân công cần sao chép (HK nguồn) ---
    const sourceAssignments = await this.prisma.teachingAssignment.findMany({
      where: {
        schoolId,
        status: AcademicEntityStatus.ACTIVE,
        courseSection: {
          semesterId: input.sourceSemesterId,
          status: AcademicEntityStatus.ACTIVE,
        },
      },
      include: {
        courseSection: {
          select: {
            code: true, // Mã lớp môn dùng để ghép với lớp tương ứng ở HK đích
          },
        },
      },
      orderBy: { assignAt: 'asc' },
    });

    if (sourceAssignments.length === 0) {
      throw new AppException(
        'NO_SOURCE_ASSIGNMENTS',
        'Không có phân công đang hoạt động (ACTIVE) ở học kỳ nguồn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // --- Lớp môn HK đích: map mã → id ---
    // Copy course-sections giữ nguyên mã (TOAN-12A5), nên ghép theo code là đủ.
    const targetSections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        semesterId: input.targetSemesterId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
      },
    });

    const targetSectionIdByCode = new Map(
      targetSections.map((section) => [section.code, section.id]),
    );

    // --- Lớp môn HK đích đã có GV chưa? (mỗi lớp chỉ 1 GV ACTIVE) ---
    const sectionsWithActiveAssignment = new Set<string>();

    if (targetSections.length > 0) {
      const existingActiveAssignments =
        await this.prisma.teachingAssignment.findMany({
          where: {
            schoolId,
            status: AcademicEntityStatus.ACTIVE,
            courseSectionId: {
              in: targetSections.map((section) => section.id),
            },
          },
          select: {
            courseSectionId: true,
          },
        });

      for (const assignment of existingActiveAssignments) {
        sectionsWithActiveAssignment.add(assignment.courseSectionId);
      }
    }

    // Ngày phân công mới = ngày bắt đầu HK đích
    const assignAt = toIsoDateString(targetSemester.startDate);
    let createdCount = 0;
    let skippedCount = 0;

    // --- Duyệt từng phân công HK nguồn và tạo bản tương ứng ở HK đích ---
    for (const source of sourceAssignments) {
      const targetSectionId = targetSectionIdByCode.get(
        source.courseSection.code,
      );

      // Chưa có lớp môn cùng mã ở HK đích (chưa copy course-sections?)
      if (!targetSectionId) {
        skippedCount += 1;
        continue;
      }

      // Lớp HK đích đã có GV (copy lại hoặc đã phân công tay) → bỏ qua
      if (sectionsWithActiveAssignment.has(targetSectionId)) {
        skippedCount += 1;
        continue;
      }

      // Dùng create() có sẵn: tạo mới hoặc kích hoạt lại nếu từng có bản INACTIVE
      await this.create(schoolId, {
        teacherId: source.teacherId,
        courseSectionId: targetSectionId,
        assignAt,
      });

      createdCount += 1;
      // Cập nhật set trong vòng lặp để tránh 2 phân công trùng 1 lớp (edge case)
      sectionsWithActiveAssignment.add(targetSectionId);
    }

    return {
      sourceSemesterId: sourceSemester.id,
      targetSemesterId: targetSemester.id,
      sourceSemesterCode: sourceSemester.code,
      targetSemesterCode: targetSemester.code,
      sourceActiveCount: sourceAssignments.length,
      createdCount,
      skippedCount,
    };
  }

  private async findAssignmentInTenant(schoolId: string, assignmentId: string) {
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
