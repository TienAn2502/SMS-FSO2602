import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcademicEntityStatus,
  AssessmentStatus,
  Prisma,
} from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { parseIsoDate } from '@/common/schemas/academic.schema';
import type { PaginationMeta } from '@/common/types/api-response.types';
import {
  FINAL_ASSESSMENT_QUOTA,
  getRegularAssessmentQuota,
  MIDTERM_ASSESSMENT_QUOTA,
} from '@/common/utils/assessment-quota.util';
import { validateDateRangeOrThrow } from '@/common/utils/date-range.util';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import { CourseSectionsService } from '@/modules/course-sections/course-sections.service';
import { GradebookGridService } from '@/modules/gradebook-grid/gradebook-grid.service';
import type { PortalGradebookGrid } from '@/modules/portal/mappers/portal-gradebook.mapper';
import { SemestersService } from '@/modules/semesters/semesters.service';
import { TeachersService } from '@/modules/teachers/teachers.service';
import {
  assessmentDetailInclude,
  assessmentInclude,
  toAssessmentDetailResponse,
  toAssessmentResponse,
  type AssessmentDetailResponse,
  type AssessmentResponse,
  type GradebookOverviewItem,
  type GradebookOverviewStatus,
} from '@/modules/assessments/mappers/assessment.mapper';
import { AssessmentQuotaService } from '@/modules/assessments/assessment-quota.service';
import type {
  CreateAssessmentInput,
  ListAssessmentsQuery,
  ListGradebookOverviewQuery,
  UpdateAssessmentInput,
} from '@/modules/assessments/schemas/assessment.schema';

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teachersService: TeachersService,
    private readonly courseSectionsService: CourseSectionsService,
    private readonly semestersService: SemestersService,
    private readonly assessmentQuotaService: AssessmentQuotaService,
    private readonly gradebookGridService: GradebookGridService,
  ) {}

  async list(
    schoolId: string,
    query: ListAssessmentsQuery,
  ): Promise<{ items: AssessmentResponse[]; meta: PaginationMeta }> {
    if (query.assessmentDateFrom && query.assessmentDateTo) {
      validateDateRangeOrThrow(
        query.assessmentDateFrom,
        query.assessmentDateTo,
      );
    }

    const semesterId = await this.resolveSemesterId(schoolId, query);

    const where: Prisma.AssessmentWhereInput = {
      schoolId,
      ...(semesterId ? { semesterId } : {}),
      ...(query.courseSectionId
        ? { courseSectionId: query.courseSectionId }
        : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assessmentDateFrom || query.assessmentDateTo
        ? {
            assessmentDate: {
              ...(query.assessmentDateFrom
                ? { gte: parseIsoDate(query.assessmentDateFrom) }
                : {}),
              ...(query.assessmentDateTo
                ? { lte: parseIsoDate(query.assessmentDateTo) }
                : {}),
            },
          }
        : {}),
      ...(query.homeroomClassId
        ? {
            courseSection: {
              homeroomClassId: query.homeroomClassId,
            },
          }
        : {}),
      ...(query.academicYearId && !semesterId
        ? {
            semester: {
              academicYearId: query.academicYearId,
            },
          }
        : {}),
    };

    const orderBy: Prisma.AssessmentOrderByWithRelationInput[] = [
      { [query.sortBy]: query.sortOrder },
      ...(query.sortBy === 'assessmentDate'
        ? [{ name: 'asc' as const }]
        : [{ assessmentDate: 'desc' as const }]),
    ];

    const [total, assessments] = await this.prisma.$transaction([
      this.prisma.assessment.count({ where }),
      this.prisma.assessment.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
        include: assessmentInclude,
      }),
    ]);

    const scoredCountMap = await this.buildScoredCountMap(
      assessments.map((assessment) => assessment.id),
    );

    return {
      items: assessments.map((assessment) =>
        toAssessmentResponse(
          assessment,
          scoredCountMap.get(assessment.id) ?? 0,
        ),
      ),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(
    schoolId: string,
    assessmentId: string,
  ): Promise<AssessmentDetailResponse> {
    const assessment = await this.findAssessmentInTenant(
      schoolId,
      assessmentId,
      true,
    );
    return toAssessmentDetailResponse(assessment);
  }

  async getGradebookGrid(
    schoolId: string,
    courseSectionId: string,
  ): Promise<PortalGradebookGrid> {
    return this.gradebookGridService.getGradebookGridForCourseSection(
      schoolId,
      courseSectionId,
    );
  }

  async listGradebookOverview(
    schoolId: string,
    query: ListGradebookOverviewQuery,
  ): Promise<{ items: GradebookOverviewItem[]; meta: PaginationMeta }> {
    const semesterId = await this.resolveOverviewSemesterId(schoolId, query);
    const where = this.buildGradebookOverviewWhere(schoolId, query, semesterId);

    const orderBy = this.buildGradebookOverviewOrderBy(query);

    const [total, courseSections] = await this.prisma.$transaction([
      this.prisma.courseSection.count({ where }),
      this.prisma.courseSection.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
        select: {
          id: true,
          code: true,
          name: true,
          semesterId: true,
          homeroomClass: { select: { code: true } },
          semester: {
            select: {
              id: true,
              name: true,
              academicYearId: true,
              academicYear: { select: { id: true, name: true } },
            },
          },
          gradeLevelSubject: {
            select: {
              periodsPerYear: true,
              evaluationMode: true,
              subject: { select: { code: true, name: true } },
            },
          },
          teachingAssignments: {
            where: { status: AcademicEntityStatus.ACTIVE },
            take: 1,
            select: {
              teacher: { select: { id: true, fullName: true } },
            },
          },
        },
      }),
    ]);

    const courseSectionIds = courseSections.map((section) => section.id);
    const statsMap = await this.buildGradebookOverviewStatsMap(courseSectionIds);

    const items = courseSections.map((section) => {
      const teacher = section.teachingAssignments[0]?.teacher ?? null;
      const stats = statsMap.get(section.id) ?? {
        assessmentCount: 0,
        scoreCount: 0,
        scoredCount: 0,
        openAssessmentCount: 0,
        isLocked: false,
      };
      const regularQuota =
        getRegularAssessmentQuota(
          section.gradeLevelSubject.periodsPerYear,
          section.gradeLevelSubject.evaluationMode,
        ) ?? 0;
      const expectedAssessmentCount =
        regularQuota + MIDTERM_ASSESSMENT_QUOTA + FINAL_ASSESSMENT_QUOTA;

      return {
        courseSectionId: section.id,
        courseSectionCode: section.code,
        courseSectionName: section.name,
        semesterId: section.semesterId,
        semesterName: section.semester.name,
        academicYearId: section.semester.academicYearId,
        academicYearName: section.semester.academicYear.name,
        homeroomClassCode: section.homeroomClass?.code ?? null,
        subjectCode: section.gradeLevelSubject.subject.code,
        subjectName: section.gradeLevelSubject.subject.name,
        teacherId: teacher?.id ?? null,
        teacherFullName: teacher?.fullName ?? null,
        assessmentCount: stats.assessmentCount,
        expectedAssessmentCount,
        scoreCount: stats.scoreCount,
        scoredCount: stats.scoredCount,
        openAssessmentCount: stats.openAssessmentCount,
        gradebookStatus: this.resolveGradebookOverviewStatus(stats),
        isLocked: stats.isLocked,
      } satisfies GradebookOverviewItem;
    });

    return {
      items,
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async create(
    schoolId: string,
    input: CreateAssessmentInput,
  ): Promise<AssessmentResponse> {
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

    await this.validateTeacher(schoolId, input.teacherId);
    await this.assertTeacherAssigned(
      schoolId,
      input.teacherId,
      input.courseSectionId,
    );

    await this.assessmentQuotaService.assertCanCreate(
      schoolId,
      input.courseSectionId,
      input.type,
    );

    const assessmentDate = parseIsoDate(input.assessmentDate);

    try {
      const assessment = await this.prisma.assessment.create({
        data: {
          schoolId,
          semesterId: courseSection.semesterId,
          courseSectionId: input.courseSectionId,
          teacherId: input.teacherId,
          type: input.type,
          name: input.name,
          assessmentDate,
          maxScore: new Prisma.Decimal(input.maxScore),
          note: input.note ?? null,
          status: AssessmentStatus.OPEN,
        },
        include: assessmentInclude,
      });

      return toAssessmentResponse(assessment, 0);
    } catch (error: unknown) {
      this.handleAssessmentConflict(error);
      throw error;
    }
  }

  async update(
    schoolId: string,
    assessmentId: string,
    input: UpdateAssessmentInput,
  ): Promise<AssessmentResponse> {
    await this.findAssessmentInTenant(schoolId, assessmentId);

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
      include: assessmentInclude,
    });

    const scoredCountMap = await this.buildScoredCountMap([assessmentId]);

    return toAssessmentResponse(updated, scoredCountMap.get(assessmentId) ?? 0);
  }

  async assertAssessmentOpen(
    schoolId: string,
    assessmentId: string,
  ): Promise<void> {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
      select: { status: true },
    });

    if (!assessment) {
      throw new AppException(
        'ASSESSMENT_NOT_FOUND',
        'Không tìm thấy đầu điểm',
        HttpStatus.NOT_FOUND,
      );
    }

    if (assessment.status !== AssessmentStatus.OPEN) {
      throw new AppException(
        'ASSESSMENT_CLOSED',
        'Đầu điểm đã khóa — không thể ghi điểm',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async buildScoredCountMap(
    assessmentIds: string[],
  ): Promise<Map<string, number>> {
    if (assessmentIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.score.groupBy({
      by: ['assessmentId'],
      where: {
        assessmentId: { in: assessmentIds },
        score: { not: null },
      },
      _count: { _all: true },
    });

    return new Map(rows.map((row) => [row.assessmentId, row._count._all]));
  }

  private async validateTeacher(
    schoolId: string,
    teacherId: string,
  ): Promise<void> {
    const teacher = await this.teachersService.findTeacherInTenant(
      schoolId,
      teacherId,
    );

    if (teacher.status !== AcademicEntityStatus.ACTIVE) {
      throw new AppException(
        'TEACHER_NOT_FOUND',
        'Giáo viên không hoạt động',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async assertTeacherAssigned(
    schoolId: string,
    teacherId: string,
    courseSectionId: string,
  ): Promise<void> {
    const assignment = await this.prisma.teachingAssignment.findFirst({
      where: {
        schoolId,
        teacherId,
        courseSectionId,
        status: AcademicEntityStatus.ACTIVE,
      },
    });

    if (!assignment) {
      throw new AppException(
        'TEACHER_NOT_ASSIGNED',
        'Giáo viên chưa được phân công lớp môn này',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async resolveSemesterId(
    schoolId: string,
    query: ListAssessmentsQuery,
  ): Promise<string | undefined> {
    if (query.semesterId) {
      return query.semesterId;
    }

    if (query.academicYearId) {
      return undefined;
    }

    const currentSemester =
      await this.semestersService.findCurrentForSchool(schoolId);

    return currentSemester.id;
  }

  private async resolveOverviewSemesterId(
    schoolId: string,
    query: ListGradebookOverviewQuery,
  ): Promise<string | undefined> {
    if (query.semesterId) {
      return query.semesterId;
    }

    if (query.academicYearId) {
      return undefined;
    }

    const currentSemester =
      await this.semestersService.findCurrentForSchool(schoolId);

    return currentSemester.id;
  }

  private buildGradebookOverviewWhere(
    schoolId: string,
    query: ListGradebookOverviewQuery,
    semesterId?: string,
  ): Prisma.CourseSectionWhereInput {
    const assessmentStatusFilter = this.buildGradebookStatusFilter(
      query.gradebookStatus,
    );

    return {
      schoolId,
      status: AcademicEntityStatus.ACTIVE,
      ...(semesterId ? { semesterId } : {}),
      ...(query.academicYearId && !semesterId
        ? { semester: { academicYearId: query.academicYearId } }
        : {}),
      ...(query.homeroomClassId
        ? { homeroomClassId: query.homeroomClassId }
        : {}),
      ...(query.subjectId
        ? { gradeLevelSubject: { subjectId: query.subjectId } }
        : {}),
      ...(query.teacherId
        ? {
            teachingAssignments: {
              some: {
                teacherId: query.teacherId,
                status: AcademicEntityStatus.ACTIVE,
              },
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
      ...(assessmentStatusFilter ? { assessments: assessmentStatusFilter } : {}),
    };
  }

  private buildGradebookStatusFilter(
    status?: GradebookOverviewStatus,
  ): Prisma.AssessmentListRelationFilter | undefined {
    if (!status) {
      return undefined;
    }

    if (status === 'NOT_STARTED') {
      return { none: {} };
    }

    if (status === 'LOCKED') {
      return {
        some: {},
        every: { status: AssessmentStatus.CLOSED },
      };
    }

    return {
      some: { status: AssessmentStatus.OPEN },
    };
  }

  private buildGradebookOverviewOrderBy(
    query: ListGradebookOverviewQuery,
  ): Prisma.CourseSectionOrderByWithRelationInput {
    switch (query.sortBy) {
      case 'name':
        return { name: query.sortOrder };
      default:
        return { code: query.sortOrder };
    }
  }

  private async buildGradebookOverviewStatsMap(courseSectionIds: string[]) {
    const map = new Map<
      string,
      {
        assessmentCount: number;
        scoreCount: number;
        scoredCount: number;
        openAssessmentCount: number;
        isLocked: boolean;
      }
    >();

    if (courseSectionIds.length === 0) {
      return map;
    }

    const assessments = await this.prisma.assessment.findMany({
      where: { courseSectionId: { in: courseSectionIds } },
      select: {
        id: true,
        courseSectionId: true,
        status: true,
        _count: { select: { scores: true } },
      },
    });

    const assessmentIds = assessments.map((row) => row.id);
    const scoredCountMap = await this.buildScoredCountMap(assessmentIds);

    for (const courseSectionId of courseSectionIds) {
      const sectionAssessments = assessments.filter(
        (row) => row.courseSectionId === courseSectionId,
      );
      const assessmentCount = sectionAssessments.length;
      const scoreCount = sectionAssessments.reduce(
        (sum, row) => sum + row._count.scores,
        0,
      );
      const scoredCount = sectionAssessments.reduce(
        (sum, row) => sum + (scoredCountMap.get(row.id) ?? 0),
        0,
      );
      const openAssessmentCount = sectionAssessments.filter(
        (row) => row.status === AssessmentStatus.OPEN,
      ).length;
      const isLocked =
        assessmentCount > 0 &&
        sectionAssessments.every(
          (row) => row.status === AssessmentStatus.CLOSED,
        );

      map.set(courseSectionId, {
        assessmentCount,
        scoreCount,
        scoredCount,
        openAssessmentCount,
        isLocked,
      });
    }

    return map;
  }

  private resolveGradebookOverviewStatus(stats: {
    assessmentCount: number;
    isLocked: boolean;
  }): GradebookOverviewStatus {
    if (stats.assessmentCount === 0) {
      return 'NOT_STARTED';
    }

    if (stats.isLocked) {
      return 'LOCKED';
    }

    return 'IN_PROGRESS';
  }

  private async findAssessmentInTenant(
    schoolId: string,
    assessmentId: string,
    withScores = false,
  ) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
      include: withScores ? assessmentDetailInclude : assessmentInclude,
    });

    if (!assessment) {
      throw new AppException(
        'ASSESSMENT_NOT_FOUND',
        'Không tìm thấy đầu điểm',
        HttpStatus.NOT_FOUND,
      );
    }

    return assessment;
  }

  private handleAssessmentConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'ASSESSMENT_CONFLICT',
        'Đã có đầu điểm trùng lớp môn, ngày, loại và tên',
        HttpStatus.CONFLICT,
      );
    }
  }
}
