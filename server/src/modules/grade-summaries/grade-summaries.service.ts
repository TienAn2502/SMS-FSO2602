import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcademicEntityStatus,
  AssessmentStatus,
  AssessmentType,
  AttendanceRecordStatus,
  EnrollmentStatus,
  PassFailResult,
  Prisma,
  PromotionDecision,
  SubjectEvaluationMode,
  SummaryStatus,
  type AcademicResultLevel,
} from '@prisma/client';

import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import {
  computeOverallAverage,
  computePassFailResult,
  computeSubjectSemesterAverage,
  computeSubjectYearAverage,
  resolveAcademicResultLevel,
  type SubjectScoreInput,
} from '@/common/utils/gradebook-average.util';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import { isGraduatingGradeLevel } from '@/common/utils/grade-level.util';
import { assessmentDetailInclude } from '@/modules/assessments/mappers/assessment.mapper';
import {
  semesterSummaryListInclude,
  subjectResultListInclude,
  toSemesterSummaryListItem,
  toSubjectResultListItem,
  toYearSummaryListItem,
  yearSummaryListInclude,
} from '@/modules/grade-summaries/mappers/grade-summary.mapper';
import type {
  FinalizePromotionInput,
  FinalizeSemesterSummariesInput,
  ListSemesterSummariesQuery,
  ListSubjectResultsQuery,
  ListYearSummariesQuery,
  RecomputeYearSummariesInput,
  UpdateYearSummaryNextHomeroomInput,
} from '@/modules/grade-summaries/schemas/grade-summaries-list.schema';
import type { RecomputeGradeSummariesInput } from '@/modules/grade-summaries/schemas/grade-summaries.schema';
import {
  buildSemesterFinalizeReadinessFromContext,
  type SemesterFinalizeReadinessContext,
} from '@/modules/grade-summaries/semester-finalization-readiness.util';
import type {
  SemesterFinalizeAllResult,
  SemesterFinalizeReadiness,
} from '@/modules/grade-summaries/semester-finalization.types';
import {
  buildYearPromotionReadinessFromContext,
  type YearPromotionReadinessContext,
} from '@/modules/grade-summaries/year-promotion-finalization-readiness.util';
import { pickGraduatedStudentIdsFromSummaries } from '@/modules/grade-summaries/graduation-student-inactivation.util';
import { pickParentIdsToInactivate } from '@/modules/grade-summaries/graduation-parent-inactivation.util';
import type {
  YearPromotionFinalizeAllResult,
  YearPromotionReadiness,
  YearRecomputeAllResult,
} from '@/modules/grade-summaries/year-promotion-finalization.types';
import {
  buildYearRecomputeIndexes,
  computeDraftYearSummaryForStudent,
  type YearRecomputeContext,
  type YearRecomputeIndexes,
} from '@/modules/grade-summaries/year-summary-recompute.util';

type ClosedAssessment = Prisma.AssessmentGetPayload<{
  include: typeof assessmentDetailInclude;
}>;

type CourseSectionScope = {
  id: string;
  code: string;
  semesterId: string;
  homeroomClassId: string | null;
  evaluationMode: SubjectEvaluationMode;
};

export interface RecomputeSubjectResultsResult {
  subjectResultsUpserted: number;
  yearAveragesUpdated: number;
  skippedClosed: number;
  studentIds: string[];
}

export interface RecomputeSemesterSummariesResult {
  semesterSummariesUpserted: number;
  skippedClosed: number;
}

export interface RecomputeGradeSummariesResult {
  subjectResultsUpserted: number;
  semesterSummariesUpserted: number;
  yearAveragesUpdated: number;
  skippedClosed: number;
}

@Injectable()
export class GradeSummariesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Gọi khi GV khóa sổ môn — chỉ tính kết quả từng môn học kỳ. */
  async onGradebookLocked(
    schoolId: string,
    courseSectionId: string,
  ): Promise<RecomputeSubjectResultsResult> {
    const courseSection = await this.loadCourseSectionScope(
      schoolId,
      courseSectionId,
    );

    if (!courseSection.homeroomClassId) {
      return {
        subjectResultsUpserted: 0,
        yearAveragesUpdated: 0,
        skippedClosed: 0,
        studentIds: [],
      };
    }

    const semester = await this.prisma.semester.findFirst({
      where: { id: courseSection.semesterId, schoolId },
      select: { academicYearId: true },
    });

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Không tìm thấy học kỳ',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.recomputeSubjectResultsForCourseSection(
      schoolId,
      courseSection,
      semester.academicYearId,
    );
  }

  /** Tính lại TB môn học kỳ (student_subject_results). */
  async recomputeSubjectResults(
    schoolId: string,
    input: RecomputeGradeSummariesInput,
  ): Promise<RecomputeSubjectResultsResult> {
    const { semester, courseSections } = await this.resolveScope(
      schoolId,
      input,
    );

    const aggregate: RecomputeSubjectResultsResult = {
      subjectResultsUpserted: 0,
      yearAveragesUpdated: 0,
      skippedClosed: 0,
      studentIds: [],
    };

    const studentIdSet = new Set<string>();

    for (const courseSection of courseSections) {
      if (!courseSection.homeroomClassId) {
        continue;
      }

      const sectionResult = await this.recomputeSubjectResultsForCourseSection(
        schoolId,
        courseSection,
        semester.academicYearId,
      );

      aggregate.subjectResultsUpserted += sectionResult.subjectResultsUpserted;
      aggregate.skippedClosed += sectionResult.skippedClosed;
      aggregate.yearAveragesUpdated += sectionResult.yearAveragesUpdated;

      for (const studentId of sectionResult.studentIds) {
        studentIdSet.add(studentId);
      }
    }

    aggregate.studentIds = [...studentIdSet];
    return aggregate;
  }

  /** Tính lại tổng kết học kỳ (student_semester_summaries). */
  async recomputeSemesterSummaries(
    schoolId: string,
    input: RecomputeGradeSummariesInput,
    studentIds?: string[],
  ): Promise<RecomputeSemesterSummariesResult> {
    await this.resolveScope(schoolId, input);

    const targetStudentIds =
      studentIds ?? (await this.collectStudentIdsForScope(schoolId, input));

    const result: RecomputeSemesterSummariesResult = {
      semesterSummariesUpserted: 0,
      skippedClosed: 0,
    };

    for (const studentId of targetStudentIds) {
      // id lớp học của học sinh
      const homeroomClassId = await this.resolveHomeroomClassIdForStudent(
        schoolId,
        studentId,
        input.semesterId,
        input.homeroomClassId,
      );

      if (!homeroomClassId) {
        continue;
      }

      // Tính toán lại tổng kết học kỳ
      const summaryResult = await this.upsertSemesterSummary(
        schoolId,
        studentId,
        input.semesterId,
        homeroomClassId,
      );

      if (summaryResult === 'upserted') {
        result.semesterSummariesUpserted += 1;
      } else if (summaryResult === 'skipped-closed') {
        result.skippedClosed += 1;
      }
    }

    return result;
  }

  /**
   * Orchestration admin — tái tính toàn bộ (kết quả môn + tổng kết học kỳ).
   * Dùng khi sửa dữ liệu, import, sửa công thức hoặc khôi phục snapshot.
   */
  async recompute(
    schoolId: string,
    input: RecomputeGradeSummariesInput,
  ): Promise<RecomputeGradeSummariesResult> {
    const subjectResults = await this.recomputeSubjectResults(schoolId, input);
    const semesterSummaries = await this.recomputeSemesterSummaries(
      schoolId,
      input,
      subjectResults.studentIds,
    );

    return {
      subjectResultsUpserted: subjectResults.subjectResultsUpserted,
      semesterSummariesUpserted: semesterSummaries.semesterSummariesUpserted,
      yearAveragesUpdated: subjectResults.yearAveragesUpdated,
      skippedClosed:
        subjectResults.skippedClosed + semesterSummaries.skippedClosed,
    };
  }

  async listSubjectResults(schoolId: string, query: ListSubjectResultsQuery) {
    const where: Prisma.StudentSubjectResultWhereInput = {
      schoolId,
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
      ...(query.courseSectionId
        ? { courseSectionId: query.courseSectionId }
        : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.homeroomClassId
        ? {
            courseSection: { homeroomClassId: query.homeroomClassId },
          }
        : {}),
      ...(query.search
        ? {
            student: {
              fullName: { contains: query.search, mode: 'insensitive' },
            },
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.studentSubjectResult.count({ where }),
      this.prisma.studentSubjectResult.findMany({
        where,
        include: subjectResultListInclude,
        orderBy: [
          { semester: { code: 'asc' } },
          { courseSection: { code: 'asc' } },
          { student: { fullName: 'asc' } },
        ],
        skip: getSkip(query.page, query.limit),
        take: query.limit,
      }),
    ]);

    return {
      items: rows.map(toSubjectResultListItem),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async listSemesterSummaries(
    schoolId: string,
    query: ListSemesterSummariesQuery,
  ) {
    const where: Prisma.StudentSemesterSummaryWhereInput = {
      schoolId,
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
      ...(query.homeroomClassId
        ? { homeroomClassId: query.homeroomClassId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            student: {
              fullName: { contains: query.search, mode: 'insensitive' },
            },
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.studentSemesterSummary.count({ where }),
      this.prisma.studentSemesterSummary.findMany({
        where,
        include: semesterSummaryListInclude,
        orderBy: [
          { semester: { code: 'asc' } },
          { homeroomClass: { code: 'asc' } },
          { student: { fullName: 'asc' } },
        ],
        skip: getSkip(query.page, query.limit),
        take: query.limit,
      }),
    ]);

    return {
      items: rows.map(toSemesterSummaryListItem),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async listYearSummaries(schoolId: string, query: ListYearSummariesQuery) {
    const where: Prisma.StudentYearSummaryWhereInput = {
      schoolId,
      ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
      ...(query.homeroomClassId
        ? { homeroomClassId: query.homeroomClassId }
        : {}),
      ...(query.promotionDecision
        ? { promotionDecision: query.promotionDecision }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            student: {
              fullName: { contains: query.search, mode: 'insensitive' },
            },
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.studentYearSummary.count({ where }),
      this.prisma.studentYearSummary.findMany({
        where,
        include: yearSummaryListInclude,
        orderBy: [
          { academicYear: { code: 'desc' } },
          { homeroomClass: { code: 'asc' } },
          { student: { fullName: 'asc' } },
        ],
        skip: getSkip(query.page, query.limit),
        take: query.limit,
      }),
    ]);

    return {
      items: rows.map(toYearSummaryListItem),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async updateYearSummaryNextHomeroom(
    schoolId: string,
    yearSummaryId: string,
    input: UpdateYearSummaryNextHomeroomInput,
  ) {
    const summary = await this.prisma.studentYearSummary.findFirst({
      where: { id: yearSummaryId, schoolId },
    });

    if (!summary) {
      throw new AppException(
        'YEAR_SUMMARY_NOT_FOUND',
        'Không tìm thấy tổng kết năm',
        HttpStatus.NOT_FOUND,
      );
    }

    if (summary.promotionDecision === PromotionDecision.GRADUATED) {
      throw new AppException(
        'NEXT_HOMEROOM_NOT_ALLOWED_FOR_GRADUATED',
        'Học sinh tốt nghiệp không gán lớp năm sau',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (summary.promotionDecision === PromotionDecision.RETAINED) {
      throw new AppException(
        'NEXT_HOMEROOM_NOT_ALLOWED_FOR_RETAINED',
        'Học sinh ở lại lớp không gán lớp năm sau',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (summary.promotionDecision !== PromotionDecision.PROMOTED) {
      throw new AppException(
        'INVALID_NEXT_HOMEROOM_CLASS',
        'Chỉ học sinh lên lớp mới được gán lớp năm sau',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (input.nextHomeroomClassId !== null) {
      const nextClass = await this.prisma.homeroomClass.findFirst({
        where: {
          id: input.nextHomeroomClassId,
          schoolId,
          status: AcademicEntityStatus.ACTIVE,
        },
      });

      if (!nextClass) {
        throw new AppException(
          'INVALID_NEXT_HOMEROOM_CLASS',
          'Lớp năm sau không hợp lệ hoặc không còn hoạt động',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      if (nextClass.academicYearId === summary.academicYearId) {
        throw new AppException(
          'NEXT_HOMEROOM_SAME_YEAR',
          'Lớp năm sau phải thuộc năm học khác với năm tổng kết',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    const updated = await this.prisma.studentYearSummary.update({
      where: { id: yearSummaryId },
      data: { nextHomeroomClassId: input.nextHomeroomClassId },
      include: yearSummaryListInclude,
    });

    return toYearSummaryListItem(updated);
  }

  async finalizeSemester(
    schoolId: string,
    semesterId: string,
    input: FinalizeSemesterSummariesInput,
  ) {
    await this.assertHomeroomInSemester(
      schoolId,
      semesterId,
      input.homeroomClassId,
    );

    await this.recomputeSemesterSummaries(schoolId, {
      semesterId,
      homeroomClassId: input.homeroomClassId,
    });

    const now = new Date();

    const [subjectClosed, summaryClosed, conductClosed] =
      await this.prisma.$transaction([
        this.prisma.studentSubjectResult.updateMany({
          where: {
            schoolId,
            semesterId,
            status: SummaryStatus.DRAFT,
            courseSection: { homeroomClassId: input.homeroomClassId },
          },
          data: { status: SummaryStatus.CLOSED },
        }),
        this.prisma.studentSemesterSummary.updateMany({
          where: {
            schoolId,
            semesterId,
            homeroomClassId: input.homeroomClassId,
            status: SummaryStatus.DRAFT,
          },
          data: {
            status: SummaryStatus.CLOSED,
            finalizedAt: now,
          },
        }),
        this.prisma.studentConductRecord.updateMany({
          where: {
            schoolId,
            semesterId,
            homeroomClassId: input.homeroomClassId,
            status: SummaryStatus.DRAFT,
          },
          data: { status: SummaryStatus.CLOSED },
        }),
      ]);

    return {
      subjectResultsClosed: subjectClosed.count,
      semesterSummariesClosed: summaryClosed.count,
      conductRecordsClosed: conductClosed.count,
    };
  }

  async getSemesterFinalizeReadiness(
    schoolId: string,
    semesterId: string,
  ): Promise<SemesterFinalizeReadiness> {
    // Lấy ra context để kiểm tra điều kiện khóa học kỳ
    const context = await this.loadSemesterFinalizeReadinessContext(
      schoolId,
      semesterId,
    );
    return buildSemesterFinalizeReadinessFromContext(context);
  }

  private async loadSemesterFinalizeReadinessContext(
    schoolId: string,
    semesterId: string,
  ): Promise<SemesterFinalizeReadinessContext> {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        academicYearId: true,
      },
    });

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Không tìm thấy học kỳ',
        HttpStatus.NOT_FOUND,
      );
    }

    const homeroomClasses = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId,
        academicYearId: semester.academicYearId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: { id: true, code: true },
      orderBy: { code: 'asc' },
    });

    const homeroomIds = homeroomClasses.map((row) => row.id);

    if (homeroomIds.length === 0) {
      return {
        semester: {
          id: semester.id,
          name: semester.name,
          code: semester.code,
        },
        homeroomClasses: [],
        courseSections: [],
        assessments: [],
        enrollmentCounts: [],
        conductCounts: [],
        summaryCounts: [],
      };
    }

    const [
      courseSections,
      assessments,
      enrollmentCounts,
      conductCounts,
      summaryCounts,
    ] = await Promise.all([
      this.prisma.courseSection.findMany({
        where: {
          schoolId,
          semesterId,
          status: AcademicEntityStatus.ACTIVE,
          homeroomClassId: { in: homeroomIds },
        },
        select: { id: true, code: true, homeroomClassId: true },
      }),
      this.prisma.assessment.findMany({
        where: {
          schoolId,
          courseSection: {
            semesterId,
            homeroomClassId: { in: homeroomIds },
            status: AcademicEntityStatus.ACTIVE,
          },
        },
        select: {
          courseSectionId: true,
          status: true,
        },
      }),
      this.prisma.studentEnrollment.groupBy({
        by: ['homeroomClassId'],
        where: {
          schoolId,
          semesterId,
          status: EnrollmentStatus.ACTIVE,
          homeroomClassId: { in: homeroomIds },
        },
        _count: { _all: true },
      }),
      this.prisma.studentConductRecord.groupBy({
        by: ['homeroomClassId'],
        where: {
          schoolId,
          semesterId,
          homeroomClassId: { in: homeroomIds },
        },
        _count: { _all: true },
      }),
      this.prisma.studentSemesterSummary.groupBy({
        by: ['homeroomClassId', 'status'],
        where: {
          schoolId,
          semesterId,
          homeroomClassId: { in: homeroomIds },
        },
        _count: { _all: true },
      }),
    ]);

    return {
      semester: {
        id: semester.id,
        name: semester.name,
        code: semester.code,
      },
      homeroomClasses,
      courseSections,
      assessments,
      enrollmentCounts: enrollmentCounts.map((row) => ({
        homeroomClassId: row.homeroomClassId,
        count: row._count._all,
      })),
      conductCounts: conductCounts.map((row) => ({
        homeroomClassId: row.homeroomClassId,
        count: row._count._all,
      })),
      summaryCounts: summaryCounts.map((row) => ({
        homeroomClassId: row.homeroomClassId,
        status: row.status,
        count: row._count._all,
      })),
    };
  }

  async finalizeSemesterAll(
    schoolId: string,
    semesterId: string,
  ): Promise<SemesterFinalizeAllResult> {
    // Kiểm tra xem đủ điều kiện khóa học kỳ chưa
    const readiness = await this.getSemesterFinalizeReadiness(
      schoolId,
      semesterId,
    );

    if (readiness.alreadyClosed) {
      throw new AppException(
        'SEMESTER_ALREADY_CLOSED',
        'Học kỳ đã được khóa tổng kết',
        HttpStatus.CONFLICT,
      );
    }

    if (!readiness.ready) {
      throw new AppException(
        'SEMESTER_NOT_READY_TO_FINALIZE',
        'Chưa đủ điều kiện khóa học kỳ — xem danh sách vấn đề',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Tính toán lại tổng kết học kỳ
    await this.recomputeSemesterSummaries(schoolId, { semesterId });

    const now = new Date();

    // Khóa tổng kết học kỳ
    const [subjectClosed, summaryClosed, conductClosed] =
      await this.prisma.$transaction([
        this.prisma.studentSubjectResult.updateMany({
          where: {
            schoolId,
            semesterId,
            status: SummaryStatus.DRAFT,
          },
          data: { status: SummaryStatus.CLOSED },
        }),
        this.prisma.studentSemesterSummary.updateMany({
          where: {
            schoolId,
            semesterId,
            status: SummaryStatus.DRAFT,
          },
          data: {
            status: SummaryStatus.CLOSED,
            finalizedAt: now,
          },
        }),
        this.prisma.studentConductRecord.updateMany({
          where: {
            schoolId,
            semesterId,
            status: SummaryStatus.DRAFT,
          },
          data: { status: SummaryStatus.CLOSED },
        }),
      ]);

    return {
      subjectResultsClosed: subjectClosed.count,
      semesterSummariesClosed: summaryClosed.count,
      conductRecordsClosed: conductClosed.count,
      homeroomClassesProcessed: readiness.totalHomeroomClasses,
    };
  }

  async recomputeYearSummaries(
    schoolId: string,
    academicYearId: string,
    homeroomClassId?: string,
  ) {
    if (homeroomClassId) {
      return this.recomputeYearSummariesForHomeroom(
        schoolId,
        academicYearId,
        homeroomClassId,
      );
    }

    return this.recomputeYearSummariesAll(schoolId, academicYearId);
  }

  async recomputeYearSummariesAll(
    schoolId: string,
    academicYearId: string,
  ): Promise<YearRecomputeAllResult> {
    const homeroomClassIds = await this.listActiveHomeroomClassIdsForYear(
      schoolId,
      academicYearId,
    );

    let yearSummariesUpserted = 0;

    for (const homeroomClassId of homeroomClassIds) {
      const result = await this.recomputeYearSummariesForHomeroom(
        schoolId,
        academicYearId,
        homeroomClassId,
      );
      yearSummariesUpserted += result.yearSummariesUpserted;
    }

    return {
      yearSummariesUpserted,
      homeroomClassesProcessed: homeroomClassIds.length,
    };
  }

  private async recomputeYearSummariesForHomeroom(
    schoolId: string,
    academicYearId: string,
    homeroomClassId: string,
  ) {
    // Lấy ra thông tin của năm học (lớp, học kỳ, năm học, enrollment, ...)
    const context = await this.loadYearRecomputeContext(
      schoolId,
      academicYearId,
      homeroomClassId,
    );

    if (context.studentIds.length === 0) {
      return {
        yearSummariesUpserted: 0,
        hk1Id: context.hk1?.id ?? null,
        hk2Id: context.hk2?.id ?? null,
      };
    }

    // Lấy ra các thông tin cần thiết để tính toán tổng kết năm học
    const indexes = await this.loadYearRecomputeIndexes(
      schoolId,
      academicYearId,
      context,
    );

    // Số lượng đã upserted year summary draft
    let upserted = 0;

    for (const studentId of context.studentIds) {
      const upsertedForStudent = await this.upsertDraftYearSummaryForStudent({
        schoolId,
        academicYearId,
        studentId,
        context,
        indexes,
      });

      if (upsertedForStudent) {
        upserted += 1;
      }
    }

    return {
      yearSummariesUpserted: upserted,
      hk1Id: context.hk1?.id ?? null,
      hk2Id: context.hk2?.id ?? null,
    };
  }

  async finalizePromotion(
    schoolId: string,
    academicYearId: string,
    input: FinalizePromotionInput,
  ) {
    // Tính toán lại điểm tổng kết học kỳ
    await this.recomputeYearSummaries(
      schoolId,
      academicYearId,
      input.homeroomClassId,
    );

    // Check xem đủ dữ liệu để tổng kết chưa
    await this.assertPromotionCanBeFinalized(
      schoolId,
      academicYearId,
      input.homeroomClassId,
      input.decisions?.map((row) => row.studentId) ?? [],
    );

    // Áp dụng quyết định tổng kết của HS nhưng vẫn chưa chốt (draft)
    await this.applyManualPromotionDecisions(
      schoolId,
      academicYearId,
      input.homeroomClassId,
      input.decisions ?? [],
    );

    // Chốt lên lớp
    return this.closeDraftYearSummaries(
      schoolId,
      academicYearId,
      input.homeroomClassId,
    );
  }

  async getYearPromotionFinalizeReadiness(
    schoolId: string,
    academicYearId: string,
  ): Promise<YearPromotionReadiness> {
    const context = await this.loadYearPromotionReadinessContext(
      schoolId,
      academicYearId,
    );
    return buildYearPromotionReadinessFromContext(context);
  }

  async finalizePromotionAll(
    schoolId: string,
    academicYearId: string,
  ): Promise<YearPromotionFinalizeAllResult> {
    const readiness = await this.getYearPromotionFinalizeReadiness(
      schoolId,
      academicYearId,
    );

    if (readiness.alreadyClosed) {
      throw new AppException(
        'YEAR_PROMOTION_ALREADY_CLOSED',
        'Năm học đã được chốt lên lớp',
        HttpStatus.CONFLICT,
      );
    }

    if (!readiness.ready) {
      throw new AppException(
        'YEAR_PROMOTION_NOT_READY',
        'Chưa đủ điều kiện chốt lên lớp — xem danh sách vấn đề',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Lấy ra danh sách lớp học trong năm học đó
    const homeroomClassIds = await this.listActiveHomeroomClassIdsForYear(
      schoolId,
      academicYearId,
    );

    for (const homeroomClassId of homeroomClassIds) {
      await this.recomputeYearSummariesForHomeroom(
        schoolId,
        academicYearId,
        homeroomClassId,
      );
      await this.assertPromotionCanBeFinalized(
        schoolId,
        academicYearId,
        homeroomClassId,
        [],
      );
    }

    const closeResult = await this.closeDraftYearSummaries(
      schoolId,
      academicYearId,
    );

    return {
      yearSummariesClosed: closeResult.yearSummariesClosed,
      homeroomClassesProcessed: homeroomClassIds.length,
      studentsInactivated: closeResult.studentsInactivated,
      parentsInactivated: closeResult.parentsInactivated,
    };
  }

  private async listActiveHomeroomClassIdsForYear(
    schoolId: string,
    academicYearId: string,
  ): Promise<string[]> {
    const homeroomClasses = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId,
        academicYearId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: { id: true },
      orderBy: { code: 'asc' },
    });

    return homeroomClasses.map((row) => row.id);
  }

  private async loadYearPromotionReadinessContext(
    schoolId: string,
    academicYearId: string,
  ): Promise<YearPromotionReadinessContext> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true, name: true },
    });

    if (!academicYear) {
      throw new AppException(
        'ACADEMIC_YEAR_NOT_FOUND',
        'Không tìm thấy năm học',
        HttpStatus.NOT_FOUND,
      );
    }

    const semesters = await this.prisma.semester.findMany({
      where: { schoolId, academicYearId },
      select: { id: true, code: true },
    });

    const hk1Id = semesters.find((row) => row.code === 'HK1')?.id ?? null;
    const hk2Id = semesters.find((row) => row.code === 'HK2')?.id ?? null;

    const homeroomClasses = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId,
        academicYearId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: { id: true, code: true },
      orderBy: { code: 'asc' },
    });

    const homeroomIds = homeroomClasses.map((row) => row.id);

    if (homeroomIds.length === 0) {
      return {
        academicYear,
        hk1Id,
        hk2Id,
        homeroomClasses: [],
        activeStudentCounts: [],
        hk1ClosedSummaryCounts: [],
        hk2ClosedSummaryCounts: [],
        hk1ClosedConductCounts: [],
        hk2ClosedConductCounts: [],
        yearSummaryCounts: [],
        pendingPromotionCounts: [],
      };
    }

    const enrollmentSemesterId = hk2Id ?? hk1Id;

    const [
      activeStudentCounts,
      hk1ClosedSummaryCounts,
      hk2ClosedSummaryCounts,
      hk1ClosedConductCounts,
      hk2ClosedConductCounts,
      yearSummaryCounts,
      pendingPromotionCounts,
    ] = await Promise.all([
      enrollmentSemesterId
        ? this.prisma.studentEnrollment.groupBy({
            by: ['homeroomClassId'],
            where: {
              schoolId,
              semesterId: enrollmentSemesterId,
              status: EnrollmentStatus.ACTIVE,
              homeroomClassId: { in: homeroomIds },
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      hk1Id
        ? this.prisma.studentSemesterSummary.groupBy({
            by: ['homeroomClassId'],
            where: {
              schoolId,
              semesterId: hk1Id,
              homeroomClassId: { in: homeroomIds },
              status: SummaryStatus.CLOSED,
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      hk2Id
        ? this.prisma.studentSemesterSummary.groupBy({
            by: ['homeroomClassId'],
            where: {
              schoolId,
              semesterId: hk2Id,
              homeroomClassId: { in: homeroomIds },
              status: SummaryStatus.CLOSED,
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      hk1Id
        ? this.prisma.studentConductRecord.groupBy({
            by: ['homeroomClassId'],
            where: {
              schoolId,
              semesterId: hk1Id,
              homeroomClassId: { in: homeroomIds },
              status: SummaryStatus.CLOSED,
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      hk2Id
        ? this.prisma.studentConductRecord.groupBy({
            by: ['homeroomClassId'],
            where: {
              schoolId,
              semesterId: hk2Id,
              homeroomClassId: { in: homeroomIds },
              status: SummaryStatus.CLOSED,
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      this.prisma.studentYearSummary.groupBy({
        by: ['homeroomClassId', 'status'],
        where: {
          schoolId,
          academicYearId,
          homeroomClassId: { in: homeroomIds },
        },
        _count: { _all: true },
      }),
      this.prisma.studentYearSummary.groupBy({
        by: ['homeroomClassId'],
        where: {
          schoolId,
          academicYearId,
          homeroomClassId: { in: homeroomIds },
          status: SummaryStatus.DRAFT,
          promotionDecision: 'PENDING',
        },
        _count: { _all: true },
      }),
    ]);

    return {
      academicYear,
      hk1Id,
      hk2Id,
      homeroomClasses,
      activeStudentCounts: activeStudentCounts.map((row) => ({
        homeroomClassId: row.homeroomClassId,
        count: row._count._all,
      })),
      hk1ClosedSummaryCounts: hk1ClosedSummaryCounts.map((row) => ({
        homeroomClassId: row.homeroomClassId,
        count: row._count._all,
      })),
      hk2ClosedSummaryCounts: hk2ClosedSummaryCounts.map((row) => ({
        homeroomClassId: row.homeroomClassId,
        count: row._count._all,
      })),
      hk1ClosedConductCounts: hk1ClosedConductCounts.map((row) => ({
        homeroomClassId: row.homeroomClassId,
        count: row._count._all,
      })),
      hk2ClosedConductCounts: hk2ClosedConductCounts.map((row) => ({
        homeroomClassId: row.homeroomClassId,
        count: row._count._all,
      })),
      yearSummaryCounts: yearSummaryCounts.map((row) => ({
        homeroomClassId: row.homeroomClassId,
        status: row.status,
        count: row._count._all,
      })),
      pendingPromotionCounts: pendingPromotionCounts.map((row) => ({
        homeroomClassId: row.homeroomClassId,
        count: row._count._all,
      })),
    };
  }

  private async loadYearRecomputeContext(
    schoolId: string,
    academicYearId: string,
    homeroomClassId: string,
  ): Promise<YearRecomputeContext> {
    const homeroomClass = await this.prisma.homeroomClass.findFirst({
      where: { id: homeroomClassId, schoolId, academicYearId },
      select: {
        id: true,
        gradeLevel: { select: { code: true } },
      },
    });

    if (!homeroomClass) {
      throw new AppException(
        'HOMEROOM_CLASS_NOT_FOUND',
        'Không tìm thấy lớp chủ nhiệm',
        HttpStatus.NOT_FOUND,
      );
    }

    const semesters = await this.prisma.semester.findMany({
      where: { schoolId, academicYearId },
      select: { id: true, code: true },
      orderBy: { code: 'asc' },
    });

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        homeroomClassId,
        status: EnrollmentStatus.ACTIVE,
        semester: { academicYearId },
      },
      select: { studentId: true },
      distinct: ['studentId'],
    });

    const schoolGradeLevels = await this.prisma.gradeLevel.findMany({
      where: { schoolId },
      select: { code: true },
    });

    const homeroomClassGradeCode = homeroomClass.gradeLevel.code;
    const schoolGradeLevelCodes = schoolGradeLevels.map((row) => row.code);

    return {
      homeroomClassId,
      isGraduatingGrade: isGraduatingGradeLevel(
        homeroomClassGradeCode,
        schoolGradeLevelCodes,
      ),
      studentIds: enrollments.map((row) => row.studentId),
      semesterIds: semesters.map((row) => row.id),
      hk1: semesters.find((row) => row.code === 'HK1'),
      hk2: semesters.find((row) => row.code === 'HK2'),
    };
  }

  private async loadYearRecomputeIndexes(
    schoolId: string,
    academicYearId: string,
    context: YearRecomputeContext,
  ): Promise<YearRecomputeIndexes> {
    const [
      semesterSummaries,
      conductRecords,
      absenceGroups,
      numericSubjectResults,
      passFailSubjectResults,
      existingYearSummaries,
    ] = await Promise.all([
      this.prisma.studentSemesterSummary.findMany({
        where: {
          schoolId,
          studentId: { in: context.studentIds },
          semesterId: { in: context.semesterIds },
        },
        include: { semester: { select: { code: true } } },
      }),
      this.prisma.studentConductRecord.findMany({
        where: {
          schoolId,
          studentId: { in: context.studentIds },
          semesterId: { in: context.semesterIds },
        },
        select: {
          studentId: true,
          semesterId: true,
          trainingResultLevel: true,
          status: true,
        },
      }),
      this.prisma.attendanceRecord.groupBy({
        by: ['studentId'],
        where: {
          schoolId,
          status: AttendanceRecordStatus.ABSENT,
          studentId: { in: context.studentIds },
          session: {
            semester: { academicYearId, schoolId },
          },
        },
        _count: { _all: true },
      }),
      this.prisma.studentSubjectResult.findMany({
        where: {
          schoolId,
          studentId: { in: context.studentIds },
          semesterId: { in: context.semesterIds },
          evaluationMode: SubjectEvaluationMode.NUMERIC,
          yearAverage: { not: null },
        },
        select: { studentId: true, yearAverage: true },
      }),
      this.prisma.studentSubjectResult.findMany({
        where: {
          schoolId,
          studentId: { in: context.studentIds },
          semesterId: { in: context.semesterIds },
          evaluationMode: SubjectEvaluationMode.PASS_FAIL,
          passFailResult: { not: null },
        },
        select: { studentId: true, passFailResult: true },
      }),
      this.prisma.studentYearSummary.findMany({
        where: {
          schoolId,
          academicYearId,
          studentId: { in: context.studentIds },
        },
        select: { studentId: true, status: true },
      }),
    ]);

    // Xây dựng các index để tính toán tổng kết năm học
    return buildYearRecomputeIndexes({
      semesterSummaries,
      conductRecords,
      absenceGroups,
      numericSubjectResults,
      passFailSubjectResults,
      existingYearSummaries,
    });
  }

  private async upsertDraftYearSummaryForStudent(input: {
    schoolId: string;
    academicYearId: string;
    studentId: string;
    context: YearRecomputeContext;
    indexes: YearRecomputeIndexes;
  }): Promise<boolean> {
    const draft = computeDraftYearSummaryForStudent({
      studentId: input.studentId,
      context: input.context,
      indexes: input.indexes,
    });

    if (!draft) {
      return false;
    }

    // Tạo year summary dạng draft (chưa được chốt lên lớp)
    await this.prisma.studentYearSummary.upsert({
      where: {
        studentId_academicYearId: {
          studentId: input.studentId,
          academicYearId: input.academicYearId,
        },
      },
      create: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        academicYearId: input.academicYearId,
        homeroomClassId: input.context.homeroomClassId,
        overallAverage: this.toDecimal(draft.overallAverage),
        academicResultLevel: draft.academicResultLevel,
        trainingResultLevel: draft.trainingResultLevel,
        promotionDecision: draft.promotionDecision,
        absentSessionCount: draft.absentSessionCount,
        status: SummaryStatus.DRAFT,
      },
      update: {
        homeroomClassId: input.context.homeroomClassId,
        overallAverage: this.toDecimal(draft.overallAverage),
        academicResultLevel: draft.academicResultLevel,
        trainingResultLevel: draft.trainingResultLevel,
        promotionDecision: draft.promotionDecision,
        absentSessionCount: draft.absentSessionCount,
      },
    });

    return true;
  }

  private async assertPromotionCanBeFinalized(
    schoolId: string,
    academicYearId: string,
    homeroomClassId: string,
    decisionStudentIds: string[],
  ): Promise<void> {
    const overrideStudentIds = new Set(decisionStudentIds);

    const pendingWithoutOverride = await this.prisma.studentYearSummary.count({
      where: {
        schoolId,
        academicYearId,
        homeroomClassId,
        status: SummaryStatus.DRAFT,
        promotionDecision: 'PENDING',
        ...(overrideStudentIds.size > 0
          ? { studentId: { notIn: [...overrideStudentIds] } }
          : {}),
      },
    });

    if (pendingWithoutOverride > 0) {
      throw new AppException(
        'PROMOTION_DATA_INCOMPLETE',
        'Chưa đủ dữ liệu để chốt lên lớp. Cần khóa tổng kết HK1, HK2 và nhận xét rèn luyện cả hai học kỳ.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async applyManualPromotionDecisions(
    schoolId: string,
    academicYearId: string,
    homeroomClassId: string,
    decisions: NonNullable<FinalizePromotionInput['decisions']>,
  ): Promise<void> {
    for (const decision of decisions) {
      await this.prisma.studentYearSummary.updateMany({
        where: {
          schoolId,
          academicYearId,
          homeroomClassId,
          studentId: decision.studentId,
          status: SummaryStatus.DRAFT,
        },
        data: {
          promotionDecision: decision.promotionDecision,
          nextHomeroomClassId: decision.nextHomeroomClassId ?? null,
          note: decision.note ?? null,
        },
      });
    }
  }

  private async closeDraftYearSummaries(
    schoolId: string,
    academicYearId: string,
    homeroomClassId?: string,
  ): Promise<{
    yearSummariesClosed: number;
    studentsInactivated: number;
    parentsInactivated: number;
  }> {
    const where: Prisma.StudentYearSummaryWhereInput = {
      schoolId,
      academicYearId,
      status: SummaryStatus.DRAFT,
      ...(homeroomClassId ? { homeroomClassId } : {}),
    };

    const draftSummaries = await this.prisma.studentYearSummary.findMany({
      where,
      select: { studentId: true, promotionDecision: true },
    });

    const graduatedStudentIds =
      pickGraduatedStudentIdsFromSummaries(draftSummaries);

    const now = new Date();
    const result = await this.prisma.studentYearSummary.updateMany({
      where,
      data: {
        status: SummaryStatus.CLOSED,
        finalizedAt: now,
      },
    });

    const studentsInactivated = await this.inactivateGraduatedStudents(
      schoolId,
      graduatedStudentIds,
    );

    const parentsInactivated = await this.inactivateParentsOfGraduatedStudents(
      schoolId,
      graduatedStudentIds,
    );

    return {
      yearSummariesClosed: result.count,
      studentsInactivated,
      parentsInactivated,
    };
  }

  private async inactivateParentsOfGraduatedStudents(
    schoolId: string,
    graduatedStudentIds: string[],
  ): Promise<number> {
    if (graduatedStudentIds.length === 0) {
      return 0;
    }

    const graduatedLinks = await this.prisma.studentParent.findMany({
      where: {
        schoolId,
        studentId: { in: graduatedStudentIds },
      },
      select: { parentId: true },
      distinct: ['parentId'],
    });

    const candidateParentIds = graduatedLinks.map((link) => link.parentId);
    if (candidateParentIds.length === 0) {
      return 0;
    }

    const [studentParentLinks, activeStudents] = await Promise.all([
      this.prisma.studentParent.findMany({
        where: {
          schoolId,
          parentId: { in: candidateParentIds },
        },
        select: {
          parentId: true,
          studentId: true,
        },
      }),
      this.prisma.student.findMany({
        where: {
          schoolId,
          status: AcademicEntityStatus.ACTIVE,
        },
        select: { id: true },
      }),
    ]);

    const parentIdsToInactivate = pickParentIdsToInactivate({
      graduatedStudentIds,
      studentParentLinks,
      activeStudentIds: new Set(activeStudents.map((student) => student.id)),
    });

    if (parentIdsToInactivate.length === 0) {
      return 0;
    }

    const result = await this.prisma.parent.updateMany({
      where: {
        schoolId,
        id: { in: parentIdsToInactivate },
        status: AcademicEntityStatus.ACTIVE,
      },
      data: { status: AcademicEntityStatus.INACTIVE },
    });

    return result.count;
  }

  private async inactivateGraduatedStudents(
    schoolId: string,
    studentIds: string[],
  ): Promise<number> {
    if (studentIds.length === 0) {
      return 0;
    }

    const result = await this.prisma.student.updateMany({
      where: {
        schoolId,
        id: { in: studentIds },
        status: AcademicEntityStatus.ACTIVE,
      },
      data: { status: AcademicEntityStatus.INACTIVE },
    });

    return result.count;
  }

  private async assertHomeroomInSemester(
    schoolId: string,
    semesterId: string,
    homeroomClassId: string,
  ): Promise<void> {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, schoolId },
      select: { academicYearId: true },
    });

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Không tìm thấy học kỳ',
        HttpStatus.NOT_FOUND,
      );
    }

    const homeroomClass = await this.prisma.homeroomClass.findFirst({
      where: {
        id: homeroomClassId,
        schoolId,
        academicYearId: semester.academicYearId,
      },
      select: { id: true },
    });

    if (!homeroomClass) {
      throw new AppException(
        'HOMEROOM_CLASS_NOT_FOUND',
        'Không tìm thấy lớp chủ nhiệm',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async resolveScope(
    schoolId: string,
    input: RecomputeGradeSummariesInput,
  ): Promise<{
    semester: { id: string; academicYearId: string };
    courseSections: CourseSectionScope[];
  }> {
    const semester = await this.prisma.semester.findFirst({
      where: {
        id: input.semesterId,
        schoolId,
      },
      select: {
        id: true,
        academicYearId: true,
      },
    });

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Không tìm thấy học kỳ',
        HttpStatus.NOT_FOUND,
      );
    }

    if (input.courseSectionId) {
      const courseSection = await this.prisma.courseSection.findFirst({
        where: {
          id: input.courseSectionId,
          schoolId,
          semesterId: input.semesterId,
        },
        select: { id: true },
      });

      if (!courseSection) {
        throw new AppException(
          'COURSE_SECTION_NOT_FOUND',
          'Không tìm thấy lớp môn học',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    if (input.homeroomClassId) {
      const homeroomClass = await this.prisma.homeroomClass.findFirst({
        where: {
          id: input.homeroomClassId,
          schoolId,
          academicYearId: semester.academicYearId,
        },
        select: { id: true },
      });

      if (!homeroomClass) {
        throw new AppException(
          'HOMEROOM_CLASS_NOT_FOUND',
          'Không tìm thấy lớp chủ nhiệm',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    const courseSections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        semesterId: input.semesterId,
        status: AcademicEntityStatus.ACTIVE,
        ...(input.courseSectionId ? { id: input.courseSectionId } : {}),
        ...(input.homeroomClassId
          ? { homeroomClassId: input.homeroomClassId }
          : {}),
      },
      select: {
        id: true,
        code: true,
        semesterId: true,
        homeroomClassId: true,
        gradeLevelSubject: {
          select: {
            evaluationMode: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return {
      semester,
      courseSections: courseSections.map((row) => ({
        id: row.id,
        code: row.code,
        semesterId: row.semesterId,
        homeroomClassId: row.homeroomClassId,
        evaluationMode: row.gradeLevelSubject.evaluationMode,
      })),
    };
  }

  private async loadCourseSectionScope(
    schoolId: string,
    courseSectionId: string,
  ): Promise<CourseSectionScope> {
    const courseSection = await this.prisma.courseSection.findFirst({
      where: {
        id: courseSectionId,
        schoolId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
        semesterId: true,
        homeroomClassId: true,
        gradeLevelSubject: {
          select: {
            evaluationMode: true,
          },
        },
      },
    });

    if (!courseSection) {
      throw new AppException(
        'COURSE_SECTION_NOT_FOUND',
        'Không tìm thấy lớp môn học',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      id: courseSection.id,
      code: courseSection.code,
      semesterId: courseSection.semesterId,
      homeroomClassId: courseSection.homeroomClassId,
      evaluationMode: courseSection.gradeLevelSubject.evaluationMode,
    };
  }

  private async collectStudentIdsForScope(
    schoolId: string,
    input: RecomputeGradeSummariesInput,
  ): Promise<string[]> {
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId: input.semesterId,
        status: EnrollmentStatus.ACTIVE,
        ...(input.homeroomClassId
          ? { homeroomClassId: input.homeroomClassId }
          : {}),
        ...(input.courseSectionId
          ? {
              homeroomClass: {
                courseSections: {
                  some: { id: input.courseSectionId },
                },
              },
            }
          : {}),
      },
      select: { studentId: true },
      distinct: ['studentId'],
    });

    return enrollments.map((row) => row.studentId);
  }

  private async recomputeSubjectResultsForCourseSection(
    schoolId: string,
    courseSection: CourseSectionScope,
    academicYearId: string,
  ): Promise<RecomputeSubjectResultsResult> {
    if (!courseSection.homeroomClassId) {
      return {
        subjectResultsUpserted: 0,
        yearAveragesUpdated: 0,
        skippedClosed: 0,
        studentIds: [],
      };
    }

    const assessments = await this.prisma.assessment.findMany({
      where: {
        schoolId,
        courseSectionId: courseSection.id,
        status: AssessmentStatus.CLOSED,
      },
      include: assessmentDetailInclude,
    });

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId: courseSection.semesterId,
        homeroomClassId: courseSection.homeroomClassId,
        status: EnrollmentStatus.ACTIVE,
      },
      select: {
        studentId: true,
      },
      orderBy: { student: { fullName: 'asc' } },
    });

    const scoreInputsByStudent = this.buildScoreInputsByStudent(
      assessments,
      enrollments.map((row) => row.studentId),
    );

    let subjectResultsUpserted = 0;
    let skippedClosed = 0;
    let yearAveragesUpdated = 0;
    const computedAt = new Date();

    for (const enrollment of enrollments) {
      const inputs = scoreInputsByStudent.get(enrollment.studentId) ?? [];
      const computed = this.computeSubjectResult(
        courseSection.evaluationMode,
        inputs,
      );

      const existing = await this.prisma.studentSubjectResult.findUnique({
        where: {
          studentId_courseSectionId_semesterId: {
            studentId: enrollment.studentId,
            courseSectionId: courseSection.id,
            semesterId: courseSection.semesterId,
          },
        },
        select: { status: true },
      });

      if (existing?.status === SummaryStatus.CLOSED) {
        skippedClosed += 1;
        continue;
      }

      await this.prisma.studentSubjectResult.upsert({
        where: {
          studentId_courseSectionId_semesterId: {
            studentId: enrollment.studentId,
            courseSectionId: courseSection.id,
            semesterId: courseSection.semesterId,
          },
        },
        create: {
          schoolId,
          studentId: enrollment.studentId,
          courseSectionId: courseSection.id,
          semesterId: courseSection.semesterId,
          evaluationMode: courseSection.evaluationMode,
          regularAverage: computed.regularAverage,
          midtermScore: computed.midtermScore,
          finalScore: computed.finalScore,
          semesterAverage: computed.semesterAverage,
          yearAverage: null,
          passFailResult: computed.passFailResult,
          computedAt,
          status: SummaryStatus.DRAFT,
        },
        update: {
          evaluationMode: courseSection.evaluationMode,
          regularAverage: computed.regularAverage,
          midtermScore: computed.midtermScore,
          finalScore: computed.finalScore,
          semesterAverage: computed.semesterAverage,
          passFailResult: computed.passFailResult,
          computedAt,
        },
      });

      subjectResultsUpserted += 1;

      const yearUpdated = await this.refreshSubjectYearAverage(
        schoolId,
        enrollment.studentId,
        courseSection.code,
        courseSection.homeroomClassId,
        academicYearId,
      );

      if (yearUpdated) {
        yearAveragesUpdated += 1;
      }
    }

    return {
      subjectResultsUpserted,
      yearAveragesUpdated,
      skippedClosed,
      studentIds: enrollments.map((row) => row.studentId),
    };
  }

  private computeSubjectResult(
    evaluationMode: SubjectEvaluationMode,
    inputs: SubjectScoreInput[],
  ): {
    regularAverage: Prisma.Decimal | null;
    midtermScore: Prisma.Decimal | null;
    finalScore: Prisma.Decimal | null;
    semesterAverage: Prisma.Decimal | null;
    passFailResult: PassFailResult | null;
  } {
    if (evaluationMode === SubjectEvaluationMode.PASS_FAIL) {
      return {
        regularAverage: null,
        midtermScore: null,
        finalScore: null,
        semesterAverage: null,
        passFailResult: computePassFailResult(inputs),
      };
    }

    const averages = computeSubjectSemesterAverage(inputs);

    return {
      regularAverage: this.toDecimal(averages.regularAverage),
      midtermScore: this.toDecimal(averages.midtermScore),
      finalScore: this.toDecimal(averages.finalScore),
      semesterAverage: this.toDecimal(averages.semesterAverage),
      passFailResult: null,
    };
  }

  private async upsertSemesterSummary(
    schoolId: string,
    studentId: string,
    semesterId: string,
    homeroomClassId: string,
  ): Promise<'upserted' | 'skipped-closed' | 'skipped'> {
    // Kiểm tra xem tổng kết học kỳ đã khóa chưa
    const existing = await this.prisma.studentSemesterSummary.findUnique({
      where: {
        studentId_semesterId: {
          studentId,
          semesterId,
        },
      },
      select: { status: true },
    });

    if (existing?.status === SummaryStatus.CLOSED) {
      return 'skipped-closed';
    }

    // Lấy ra kết quả môn học của học sinh
    const subjectResults = await this.prisma.studentSubjectResult.findMany({
      where: {
        schoolId,
        studentId,
        semesterId,
      },
      select: {
        evaluationMode: true,
        semesterAverage: true,
        passFailResult: true,
      },
    });

    const subjectAverages = subjectResults
      .filter(
        (row) =>
          row.evaluationMode === SubjectEvaluationMode.NUMERIC &&
          row.semesterAverage != null,
      )
      .map((row) => row.semesterAverage!.toNumber());

    const passFailResults = subjectResults
      .filter((row) => row.evaluationMode === SubjectEvaluationMode.PASS_FAIL)
      .map((row) => row.passFailResult)
      .filter((result): result is PassFailResult => result != null);

    const overallAverage = computeOverallAverage(subjectAverages);
    const academicResultLevel: AcademicResultLevel | null =
      resolveAcademicResultLevel({
        numericSubjectAverages: subjectAverages,
        passFailResults,
      });

    const conductRecord = await this.prisma.studentConductRecord.findUnique({
      where: {
        studentId_semesterId: {
          studentId,
          semesterId,
        },
      },
      select: {
        trainingResultLevel: true,
      },
    });

    await this.prisma.studentSemesterSummary.upsert({
      where: {
        studentId_semesterId: {
          studentId,
          semesterId,
        },
      },
      create: {
        schoolId,
        studentId,
        semesterId,
        homeroomClassId,
        overallAverage: this.toDecimal(overallAverage),
        academicResultLevel,
        trainingResultLevel: conductRecord?.trainingResultLevel ?? null,
        subjectCount: subjectAverages.length,
        status: SummaryStatus.DRAFT,
      },
      update: {
        homeroomClassId,
        overallAverage: this.toDecimal(overallAverage),
        academicResultLevel,
        trainingResultLevel: conductRecord?.trainingResultLevel ?? null,
        subjectCount: subjectAverages.length,
      },
    });

    return 'upserted';
  }

  private async refreshSubjectYearAverage(
    schoolId: string,
    studentId: string,
    courseSectionCode: string,
    homeroomClassId: string,
    academicYearId: string,
  ): Promise<boolean> {
    const courseSections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        code: courseSectionCode,
        homeroomClassId,
        semester: {
          academicYearId,
        },
      },
      select: {
        id: true,
        semesterId: true,
        semester: {
          select: { code: true },
        },
      },
    });

    if (courseSections.length === 0) {
      return false;
    }

    const subjectResults = await this.prisma.studentSubjectResult.findMany({
      where: {
        schoolId,
        studentId,
        courseSectionId: {
          in: courseSections.map((row) => row.id),
        },
        evaluationMode: SubjectEvaluationMode.NUMERIC,
      },
      select: {
        id: true,
        courseSectionId: true,
        semesterAverage: true,
        status: true,
        semester: {
          select: { code: true },
        },
      },
    });

    const hk1Average =
      subjectResults
        .find((row) => row.semester.code === 'HK1')
        ?.semesterAverage?.toNumber() ?? null;
    const hk2Average =
      subjectResults
        .find((row) => row.semester.code === 'HK2')
        ?.semesterAverage?.toNumber() ?? null;
    const yearAverage = computeSubjectYearAverage(hk1Average, hk2Average);

    if (yearAverage == null) {
      return false;
    }

    let updated = false;

    for (const row of subjectResults) {
      if (row.status === SummaryStatus.CLOSED) {
        continue;
      }

      await this.prisma.studentSubjectResult.update({
        where: { id: row.id },
        data: {
          yearAverage: new Prisma.Decimal(yearAverage),
        },
      });
      updated = true;
    }

    return updated;
  }

  private buildScoreInputsByStudent(
    assessments: ClosedAssessment[],
    studentIds: string[],
  ): Map<string, SubjectScoreInput[]> {
    const orderedAssessments = this.orderAssessmentsForInputs(assessments);
    const result = new Map<string, SubjectScoreInput[]>();

    for (const studentId of studentIds) {
      const inputs: SubjectScoreInput[] = [];

      for (const assessment of orderedAssessments) {
        const scoreRow = assessment.scores.find(
          (row) => row.studentId === studentId,
        );

        inputs.push({
          type: assessment.type,
          score: scoreRow?.score?.toNumber() ?? null,
          note: scoreRow?.note ?? null,
        });
      }

      result.set(studentId, inputs);
    }

    return result;
  }

  private orderAssessmentsForInputs(
    assessments: ClosedAssessment[],
  ): ClosedAssessment[] {
    const byDateThenName = (left: ClosedAssessment, right: ClosedAssessment) =>
      left.assessmentDate.getTime() - right.assessmentDate.getTime() ||
      left.name.localeCompare(right.name, 'vi');

    return [
      ...assessments
        .filter((row) => row.type === AssessmentType.REGULAR)
        .sort(byDateThenName),
      ...assessments
        .filter((row) => row.type === AssessmentType.MIDTERM)
        .sort(byDateThenName)
        .slice(0, 1),
      ...assessments
        .filter((row) => row.type === AssessmentType.FINAL)
        .sort(byDateThenName)
        .slice(0, 1),
    ];
  }

  private async resolveHomeroomClassIdForStudent(
    schoolId: string,
    studentId: string,
    semesterId: string,
    homeroomClassFilter?: string,
  ): Promise<string | null> {
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        schoolId,
        studentId,
        semesterId,
        status: EnrollmentStatus.ACTIVE,
        ...(homeroomClassFilter
          ? { homeroomClassId: homeroomClassFilter }
          : {}),
      },
      select: {
        homeroomClassId: true,
      },
    });

    return enrollment?.homeroomClassId ?? null;
  }

  private toDecimal(value: number | null): Prisma.Decimal | null {
    if (value == null) {
      return null;
    }

    return new Prisma.Decimal(value);
  }
}
