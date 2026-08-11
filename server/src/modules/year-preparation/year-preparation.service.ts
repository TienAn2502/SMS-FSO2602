import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcademicEntityStatus,
  PromotionDecision,
  SummaryStatus,
} from '@prisma/client';

import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { StudentEnrollmentsService } from '@/modules/student-enrollments/student-enrollments.service';
import type {
  PrepareNextYearInput,
  PrepareNextYearPreviewQuery,
} from '@/modules/year-preparation/schemas/year-preparation.schema';
import {
  buildPromotedHomeroomClassCode,
  findNextGradeLevelCode,
} from '@/modules/year-preparation/year-preparation.util';

type GradeLevelRow = { id: string; code: string; name: string };

type SourceClassRow = {
  id: string;
  code: string;
  name: string;
  capacity: number | null;
  homeroomTeacherId: string | null;
  gradeLevelId: string;
  gradeLevel: GradeLevelRow;
};

type ClassNeed = {
  gradeLevelId: string;
  gradeLevelCode: string;
  code: string;
  name: string;
  capacity: number | null;
  homeroomTeacherId: string | null;
  reason: 'PROMOTED';
  sourceClassId: string;
  sourceClassCode: string;
};

export type PrepareNextYearPreviewResult = {
  sourceAcademicYearId: string;
  sourceAcademicYearName: string;
  targetAcademicYearId: string;
  targetAcademicYearName: string;
  classesToCreate: number;
  classesAlreadyExist: number;
  classPlans: Array<{
    code: string;
    gradeLevelCode: string;
    reason: 'PROMOTED';
    sourceClassCode: string;
    exists: boolean;
    homeroomTeacherId: string | null;
  }>;
  studentsToMap: number;
  promotedCount: number;
  retainedSkippedCount: number;
  graduatedSkippedCount: number;
  unmappedCount: number;
  enrollmentPreview: {
    eligibleCount: number;
    wouldCreateCount: number;
    skippedExistingCount: number;
    missingNextClassCount: number;
  } | null;
};

export type PrepareNextYearResult = {
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
  classesCreated: number;
  classesSkippedExisting: number;
  studentsMapped: number;
  promotedMapped: number;
  retainedSkipped: number;
  graduatedSkipped: number;
  unmapped: number;
  enrollments: {
    createdCount: number;
    skippedExistingCount: number;
    missingNextClassCount: number;
    eligibleCount: number;
  } | null;
};

@Injectable()
export class YearPreparationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentEnrollmentsService: StudentEnrollmentsService,
  ) {}

  async preview(
    schoolId: string,
    query: PrepareNextYearPreviewQuery,
  ): Promise<PrepareNextYearPreviewResult> {
    const ctx = await this.loadContext(
      schoolId,
      query.sourceAcademicYearId,
      query.targetAcademicYearId,
    );
    const plan = this.buildClassAndMappingPlan(ctx);

    let enrollmentPreview: PrepareNextYearPreviewResult['enrollmentPreview'] =
      null;

    if (query.targetSemesterId) {
      // Preview enrollment as if mapping already applied (simulate counts)
      enrollmentPreview = {
        eligibleCount: plan.promotedCount,
        wouldCreateCount: plan.studentsToMap,
        skippedExistingCount: 0,
        missingNextClassCount: plan.unmappedCount,
      };
    }

    return {
      sourceAcademicYearId: ctx.sourceYear.id,
      sourceAcademicYearName: ctx.sourceYear.name,
      targetAcademicYearId: ctx.targetYear.id,
      targetAcademicYearName: ctx.targetYear.name,
      classesToCreate: plan.classNeeds.filter((need) => !need.exists).length,
      classesAlreadyExist: plan.classNeeds.filter((need) => need.exists)
        .length,
      classPlans: plan.classNeeds.map((need) => ({
        code: need.code,
        gradeLevelCode: need.gradeLevelCode,
        reason: need.reason,
        sourceClassCode: need.sourceClassCode,
        exists: need.exists,
        homeroomTeacherId: need.homeroomTeacherId,
      })),
      studentsToMap: plan.studentsToMap,
      promotedCount: plan.promotedCount,
      retainedSkippedCount: plan.retainedSkippedCount,
      graduatedSkippedCount: plan.graduatedSkippedCount,
      unmappedCount: plan.unmappedCount,
      enrollmentPreview,
    };
  }

  async prepare(
    schoolId: string,
    input: PrepareNextYearInput,
  ): Promise<PrepareNextYearResult> {
    const ctx = await this.loadContext(
      schoolId,
      input.sourceAcademicYearId,
      input.targetAcademicYearId,
    );
    const plan = this.buildClassAndMappingPlan(ctx);

    let classesCreated = 0;
    let classesSkippedExisting = 0;

    const targetClassIdByKey = new Map(ctx.targetClassByKey);

    for (const need of plan.classNeeds) {
      const key = `${need.gradeLevelId}:${need.code}`;
      const existingId = targetClassIdByKey.get(key);
      if (existingId) {
        classesSkippedExisting += 1;
        continue;
      }

      const created = await this.prisma.homeroomClass.create({
        data: {
          schoolId,
          academicYearId: ctx.targetYear.id,
          gradeLevelId: need.gradeLevelId,
          code: need.code,
          name: need.name,
          capacity: need.capacity,
          homeroomTeacherId: need.homeroomTeacherId,
          status: AcademicEntityStatus.ACTIVE,
        },
      });
      targetClassIdByKey.set(key, created.id);
      classesCreated += 1;
    }

    let studentsMapped = 0;
    let promotedMapped = 0;
    let retainedSkipped = 0;
    let graduatedSkipped = 0;
    let unmapped = 0;

    for (const summary of ctx.summaries) {
      if (summary.promotionDecision === PromotionDecision.GRADUATED) {
        graduatedSkipped += 1;
        continue;
      }

      if (summary.promotionDecision === PromotionDecision.RETAINED) {
        retainedSkipped += 1;
        continue;
      }

      if (summary.promotionDecision !== PromotionDecision.PROMOTED) {
        continue;
      }

      const sourceClass = ctx.sourceClassById.get(summary.homeroomClassId);
      if (!sourceClass) {
        unmapped += 1;
        continue;
      }

      const targetKey = this.resolveTargetClassKey(
        sourceClass,
        summary.promotionDecision,
        ctx.gradeLevels,
        ctx.gradeLevelByCode,
      );

      if (!targetKey) {
        unmapped += 1;
        continue;
      }

      const targetClassId = targetClassIdByKey.get(targetKey);
      if (!targetClassId) {
        unmapped += 1;
        continue;
      }

      await this.prisma.studentYearSummary.update({
        where: { id: summary.id },
        data: { nextHomeroomClassId: targetClassId },
      });

      studentsMapped += 1;
      promotedMapped += 1;
    }

    let enrollments: PrepareNextYearResult['enrollments'] = null;

    const shouldCreateEnrollments =
      input.createEnrollments !== false && Boolean(input.targetSemesterId);

    if (shouldCreateEnrollments && input.targetSemesterId) {
      await this.assertTargetSemester(
        schoolId,
        input.targetSemesterId,
        ctx.targetYear.id,
      );

      const enrollmentResult =
        await this.studentEnrollmentsService.createFromYearPromotions(
          schoolId,
          {
            sourceAcademicYearId: input.sourceAcademicYearId,
            targetSemesterId: input.targetSemesterId,
            enrolledAt: input.enrolledAt,
            note: input.note,
          },
        );

      enrollments = {
        createdCount: enrollmentResult.createdCount,
        skippedExistingCount: enrollmentResult.skippedExistingCount,
        missingNextClassCount: enrollmentResult.missingNextClassCount,
        eligibleCount: enrollmentResult.eligibleCount,
      };
    }

    return {
      sourceAcademicYearId: ctx.sourceYear.id,
      targetAcademicYearId: ctx.targetYear.id,
      classesCreated,
      classesSkippedExisting,
      studentsMapped,
      promotedMapped,
      retainedSkipped,
      graduatedSkipped,
      unmapped,
      enrollments,
    };
  }

  private async loadContext(
    schoolId: string,
    sourceAcademicYearId: string,
    targetAcademicYearId: string,
  ) {
    if (sourceAcademicYearId === targetAcademicYearId) {
      throw new AppException(
        'YEAR_PREP_SAME_YEAR',
        'Năm học nguồn và năm học đích phải khác nhau',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const [sourceYear, targetYear] = await Promise.all([
      this.prisma.academicYear.findFirst({
        where: { id: sourceAcademicYearId, schoolId },
        select: { id: true, name: true },
      }),
      this.prisma.academicYear.findFirst({
        where: { id: targetAcademicYearId, schoolId },
        select: { id: true, name: true },
      }),
    ]);

    if (!sourceYear || !targetYear) {
      throw new AppException(
        'ACADEMIC_YEAR_NOT_FOUND',
        'Không tìm thấy năm học nguồn hoặc năm học đích',
        HttpStatus.NOT_FOUND,
      );
    }

    const closedCount = await this.prisma.studentYearSummary.count({
      where: {
        schoolId,
        academicYearId: sourceAcademicYearId,
        status: SummaryStatus.CLOSED,
      },
    });

    if (closedCount === 0) {
      throw new AppException(
        'YEAR_PREP_SOURCE_NOT_CLOSED',
        'Năm học nguồn chưa chốt lên lớp — không thể chuẩn bị năm sau',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const gradeLevels = await this.prisma.gradeLevel.findMany({
      where: { schoolId },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });

    const gradeLevelByCode = new Map(
      gradeLevels.map((row) => [row.code, row] as const),
    );

    const sourceClasses = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId,
        academicYearId: sourceAcademicYearId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
        name: true,
        capacity: true,
        homeroomTeacherId: true,
        gradeLevelId: true,
        gradeLevel: { select: { id: true, code: true, name: true } },
      },
      orderBy: { code: 'asc' },
    });

    const sourceClassById = new Map(
      sourceClasses.map((row) => [row.id, row] as const),
    );

    const targetClasses = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId,
        academicYearId: targetAcademicYearId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: { id: true, code: true, gradeLevelId: true },
    });

    const targetClassByKey = new Map<string, string>(
      targetClasses.map(
        (row) => [`${row.gradeLevelId}:${row.code}`, row.id] as const,
      ),
    );

    const summaries = await this.prisma.studentYearSummary.findMany({
      where: {
        schoolId,
        academicYearId: sourceAcademicYearId,
        status: SummaryStatus.CLOSED,
        promotionDecision: {
          in: [
            PromotionDecision.PROMOTED,
            PromotionDecision.RETAINED,
            PromotionDecision.GRADUATED,
          ],
        },
      },
      select: {
        id: true,
        studentId: true,
        homeroomClassId: true,
        promotionDecision: true,
        nextHomeroomClassId: true,
      },
    });

    return {
      sourceYear,
      targetYear,
      gradeLevels,
      gradeLevelByCode,
      sourceClasses,
      sourceClassById,
      targetClassByKey,
      summaries,
    };
  }

  private buildClassAndMappingPlan(
    ctx: Awaited<ReturnType<YearPreparationService['loadContext']>>,
  ) {
    const needsByKey = new Map<
      string,
      ClassNeed & { exists: boolean }
    >();

    const promotedSourceClassIds = new Set<string>();

    for (const summary of ctx.summaries) {
      if (summary.promotionDecision === PromotionDecision.PROMOTED) {
        promotedSourceClassIds.add(summary.homeroomClassId);
      }
    }

    const gradeCodes = ctx.gradeLevels.map((row) => row.code);

    for (const sourceClass of ctx.sourceClasses) {
      if (!promotedSourceClassIds.has(sourceClass.id)) {
        continue;
      }

      const nextGradeCode = findNextGradeLevelCode(
        sourceClass.gradeLevel.code,
        gradeCodes,
      );
      const nextGrade = nextGradeCode
        ? ctx.gradeLevelByCode.get(nextGradeCode)
        : undefined;

      if (!nextGrade) {
        continue;
      }

      const nextCode = buildPromotedHomeroomClassCode(
        sourceClass.code,
        sourceClass.gradeLevel.code,
        nextGrade.code,
      );
      const nextName = sourceClass.name.startsWith(sourceClass.gradeLevel.code)
        ? `${nextGrade.code}${sourceClass.name.slice(sourceClass.gradeLevel.code.length)}`
        : nextCode;

      this.addClassNeed(needsByKey, ctx.targetClassByKey, {
        gradeLevelId: nextGrade.id,
        gradeLevelCode: nextGrade.code,
        code: nextCode,
        name: nextName,
        capacity: sourceClass.capacity,
        homeroomTeacherId: sourceClass.homeroomTeacherId,
        reason: 'PROMOTED',
        sourceClassId: sourceClass.id,
        sourceClassCode: sourceClass.code,
      });
    }

    let promotedCount = 0;
    let retainedSkippedCount = 0;
    let graduatedSkippedCount = 0;
    let studentsToMap = 0;
    let unmappedCount = 0;

    for (const summary of ctx.summaries) {
      if (summary.promotionDecision === PromotionDecision.GRADUATED) {
        graduatedSkippedCount += 1;
        continue;
      }

      if (summary.promotionDecision === PromotionDecision.RETAINED) {
        retainedSkippedCount += 1;
        continue;
      }

      if (summary.promotionDecision !== PromotionDecision.PROMOTED) {
        continue;
      }

      promotedCount += 1;

      const sourceClass = ctx.sourceClassById.get(summary.homeroomClassId);
      if (!sourceClass) {
        unmappedCount += 1;
        continue;
      }

      const targetKey = this.resolveTargetClassKey(
        sourceClass,
        summary.promotionDecision,
        ctx.gradeLevels,
        ctx.gradeLevelByCode,
      );

      if (!targetKey) {
        unmappedCount += 1;
        continue;
      }

      studentsToMap += 1;
    }

    return {
      classNeeds: [...needsByKey.values()],
      studentsToMap,
      promotedCount,
      retainedSkippedCount,
      graduatedSkippedCount,
      unmappedCount,
    };
  }

  private async assertTargetSemester(
    schoolId: string,
    targetSemesterId: string,
    targetAcademicYearId: string,
  ) {
    const semester = await this.prisma.semester.findFirst({
      where: { id: targetSemesterId, schoolId },
      select: { id: true, academicYearId: true },
    });

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Không tìm thấy học kỳ đích',
        HttpStatus.NOT_FOUND,
      );
    }

    if (semester.academicYearId !== targetAcademicYearId) {
      throw new AppException(
        'YEAR_PREP_SEMESTER_YEAR_MISMATCH',
        'Học kỳ đích phải thuộc năm học đích đã chọn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private addClassNeed(
    needsByKey: Map<string, ClassNeed & { exists: boolean }>,
    targetClassByKey: Map<string, string>,
    need: ClassNeed,
  ) {
    const key = `${need.gradeLevelId}:${need.code}`;
    if (needsByKey.has(key)) {
      return;
    }

    needsByKey.set(key, {
      ...need,
      exists: targetClassByKey.has(key),
    });
  }

  private resolveTargetClassKey(
    sourceClass: SourceClassRow,
    decision: PromotionDecision,
    gradeLevels: GradeLevelRow[],
    gradeLevelByCode: Map<string, GradeLevelRow>,
  ): string | null {
    if (decision !== PromotionDecision.PROMOTED) {
      return null;
    }

    const nextGradeCode = findNextGradeLevelCode(
      sourceClass.gradeLevel.code,
      gradeLevels.map((row) => row.code),
    );
    const nextGrade = nextGradeCode
      ? gradeLevelByCode.get(nextGradeCode)
      : undefined;
    if (!nextGrade) {
      return null;
    }

    const nextCode = buildPromotedHomeroomClassCode(
      sourceClass.code,
      sourceClass.gradeLevel.code,
      nextGrade.code,
    );
    return `${nextGrade.id}:${nextCode}`;
  }
}
