import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcademicEntityStatus,
  EnrollmentStatus,
  PromotionDecision,
  SummaryStatus,
} from '@prisma/client';

import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import {
  parseIsoDate,
  toIsoDateString,
} from '@/common/schemas/academic.schema';
import type { PaginationMeta } from '@/common/types/api-response.types';
import { STUDENT_YEAR_ENROLLMENT_STATUSES } from '@/common/utils/enrollment-status.util';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import { planEvenClassPlacement, isRetainedGradeCompatible } from '@/modules/class-placement/class-placement.util';
import type {
  AssignClassPlacementInput,
  AutoBalanceClassPlacementInput,
  AutoBalancePreviewQuery,
  ListUnassignedPlacementQuery,
  PlacementReason,
} from '@/modules/class-placement/schemas/class-placement.schema';

export type UnassignedPlacementItem = {
  studentId: string;
  fullName: string;
  externalCode: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  reason: PlacementReason;
  previousHomeroomClassCode: string | null;
  previousGradeLevelId: string | null;
  previousGradeLevelCode: string | null;
  previousAcademicYearName: string | null;
};

@Injectable()
export class ClassPlacementService {
  constructor(private readonly prisma: PrismaService) {}

  async getUnassignedPool(
    schoolId: string,
    academicYearId: string,
    semesterId: string,
    filters: {
      reason?: PlacementReason;
      search?: string;
      gradeLevelId?: string;
    } = {},
  ): Promise<UnassignedPlacementItem[]> {
    const semester = await this.requireSemester(schoolId, semesterId);
    if (semester.academicYearId !== academicYearId) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Học kỳ không thuộc năm học đã chọn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return this.buildUnassignedPool(
      schoolId,
      academicYearId,
      semesterId,
      filters,
    );
  }

  async listUnassigned(
    schoolId: string,
    query: ListUnassignedPlacementQuery,
  ): Promise<{ items: UnassignedPlacementItem[]; meta: PaginationMeta }> {
    const semester = await this.requireSemester(schoolId, query.semesterId);
    const pool = await this.buildUnassignedPool(
      schoolId,
      semester.academicYearId,
      query.semesterId,
      {
        reason: query.reason,
        search: query.search,
        gradeLevelId: query.gradeLevelId,
      },
    );

    const total = pool.length;
    const pageItems = pool.slice(
      getSkip(query.page, query.limit),
      getSkip(query.page, query.limit) + query.limit,
    );

    return {
      items: pageItems,
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async previewAutoBalance(
    schoolId: string,
    query: AutoBalancePreviewQuery,
  ) {
    const plan = await this.buildAutoBalancePlan(schoolId, {
      semesterId: query.semesterId,
      gradeLevelId: query.gradeLevelId,
      reason: query.reason,
    });

    return {
      semesterId: plan.semester.id,
      academicYearId: plan.semester.academicYearId,
      gradeLevelId: plan.gradeLevel.id,
      gradeLevelCode: plan.gradeLevel.code,
      studentCount: plan.students.length,
      classCount: plan.classes.length,
      wouldAssignCount: plan.planned.assignments.length,
      unplacedCount: plan.planned.unplacedStudentIds.length,
      classLoads: plan.classes.map((row) => ({
        homeroomClassId: row.id,
        code: row.code,
        currentCount: row.currentCount,
        capacity: row.capacity,
        wouldReceive: plan.planned.assignments.filter(
          (assignment) => assignment.homeroomClassId === row.id,
        ).length,
      })),
    };
  }

  async assign(
    schoolId: string,
    input: AssignClassPlacementInput,
  ) {
    const semester = await this.requireSemester(schoolId, input.semesterId);
    const enrolledAt = input.enrolledAt
      ? parseIsoDate(input.enrolledAt)
      : semester.startDate;

    const studentIds = [...new Set(input.assignments.map((row) => row.studentId))];
    const classIds = [
      ...new Set(input.assignments.map((row) => row.homeroomClassId)),
    ];

    await this.assertStudentsUnassigned(
      schoolId,
      input.semesterId,
      studentIds,
    );

    const classes = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId,
        id: { in: classIds },
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
        academicYearId: true,
        gradeLevelId: true,
        gradeLevel: { select: { code: true } },
      },
    });

    if (classes.length !== classIds.length) {
      throw new AppException(
        'INVALID_HOMEROOM_CLASS',
        'Một hoặc nhiều lớp không hợp lệ hoặc không còn hoạt động',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    for (const homeroom of classes) {
      if (homeroom.academicYearId !== semester.academicYearId) {
        throw new AppException(
          'TENANT_MISMATCH',
          'Lớp hành chính không thuộc năm học của học kỳ đã chọn',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    await this.assertRetainedAssignmentsMatchGrade(
      schoolId,
      semester.academicYearId,
      input.assignments,
      new Map(
        classes.map(
          (row) =>
            [
              row.id,
              {
                gradeLevelId: row.gradeLevelId,
                gradeLevelCode: row.gradeLevel.code,
                code: row.code,
              },
            ] as const,
        ),
      ),
    );

    const result = await this.prisma.studentEnrollment.createMany({
      data: input.assignments.map((row) => ({
        schoolId,
        studentId: row.studentId,
        semesterId: input.semesterId,
        homeroomClassId: row.homeroomClassId,
        enrolledAt,
        note: input.note ?? 'Xếp lớp đầu năm',
        status: EnrollmentStatus.ACTIVE,
      })),
      skipDuplicates: true,
    });

    return {
      semesterId: input.semesterId,
      createdCount: result.count,
      requestedCount: input.assignments.length,
    };
  }

  async autoBalance(schoolId: string, input: AutoBalanceClassPlacementInput) {
    const plan = await this.buildAutoBalancePlan(schoolId, input);

    if (plan.planned.assignments.length === 0) {
      throw new AppException(
        'CLASS_PLACEMENT_NO_ASSIGNMENTS',
        'Không xếp được học sinh nào — kiểm tra danh sách chờ và sức chứa lớp',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const enrolledAt = input.enrolledAt
      ? parseIsoDate(input.enrolledAt)
      : plan.semester.startDate;

    const result = await this.prisma.studentEnrollment.createMany({
      data: plan.planned.assignments.map((row) => ({
        schoolId,
        studentId: row.studentId,
        semesterId: input.semesterId,
        homeroomClassId: row.homeroomClassId,
        enrolledAt,
        note: input.note ?? `Xếp lớp đều khối ${plan.gradeLevel.code}`,
        status: EnrollmentStatus.ACTIVE,
      })),
      skipDuplicates: true,
    });

    return {
      semesterId: input.semesterId,
      gradeLevelId: plan.gradeLevel.id,
      gradeLevelCode: plan.gradeLevel.code,
      createdCount: result.count,
      unplacedCount: plan.planned.unplacedStudentIds.length,
      unplacedStudentIds: plan.planned.unplacedStudentIds,
      classLoads: plan.classes.map((row) => ({
        homeroomClassId: row.id,
        code: row.code,
        assignedCount: plan.planned.assignments.filter(
          (assignment) => assignment.homeroomClassId === row.id,
        ).length,
      })),
    };
  }

  private async buildAutoBalancePlan(
    schoolId: string,
    input: {
      semesterId: string;
      gradeLevelId: string;
      reason?: PlacementReason;
      studentIds?: string[];
    },
  ) {
    const semester = await this.requireSemester(schoolId, input.semesterId);

    const gradeLevel = await this.prisma.gradeLevel.findFirst({
      where: { id: input.gradeLevelId, schoolId },
      select: { id: true, code: true, name: true },
    });

    if (!gradeLevel) {
      throw new AppException(
        'GRADE_LEVEL_NOT_FOUND',
        'Không tìm thấy khối',
        HttpStatus.NOT_FOUND,
      );
    }

    const pool = await this.buildUnassignedPool(
      schoolId,
      semester.academicYearId,
      input.semesterId,
      {
        reason: input.reason,
        gradeLevelId: input.gradeLevelId,
      },
    );

    /**
     * gradeLevelId khi list/auto:
     * - RETAINED: chỉ HS ở lại cùng khối trước đó
     * - NEW_INTAKE: mọi HS mới (sẽ xếp vào lớp của khối đích)
     * - không filter reason: RETAINED khớp khối + toàn bộ NEW_INTAKE
     */
    let students = pool;
    if (input.studentIds?.length) {
      const selected = new Set(input.studentIds);
      students = pool.filter((row) => selected.has(row.studentId));
    }

    const classes = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId,
        academicYearId: semester.academicYearId,
        gradeLevelId: input.gradeLevelId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
        capacity: true,
      },
      orderBy: { code: 'asc' },
    });

    if (classes.length === 0) {
      throw new AppException(
        'CLASS_PLACEMENT_NO_CLASSES',
        'Không có lớp hành chính ACTIVE trong khối đã chọn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const counts = await this.prisma.studentEnrollment.groupBy({
      by: ['homeroomClassId'],
      where: {
        schoolId,
        semesterId: input.semesterId,
        status: { in: STUDENT_YEAR_ENROLLMENT_STATUSES },
        homeroomClassId: { in: classes.map((row) => row.id) },
      },
      _count: { _all: true },
    });

    const countByClass = new Map(
      counts.map((row) => [row.homeroomClassId, row._count._all] as const),
    );

    const classSeats = classes.map((row) => ({
      id: row.id,
      code: row.code,
      currentCount: countByClass.get(row.id) ?? 0,
      capacity: row.capacity,
    }));

    const planned = planEvenClassPlacement(
      students
        .slice()
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'))
        .map((row) => ({ studentId: row.studentId })),
      classSeats,
    );

    return {
      semester,
      gradeLevel,
      students,
      classes: classSeats,
      planned,
    };
  }

  private async buildUnassignedPool(
    schoolId: string,
    academicYearId: string,
    semesterId: string,
    filters: {
      reason?: PlacementReason;
      search?: string;
      gradeLevelId?: string;
    },
  ): Promise<UnassignedPlacementItem[]> {
    const enrolledStudentRows = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId,
        status: { in: STUDENT_YEAR_ENROLLMENT_STATUSES },
      },
      select: { studentId: true },
      distinct: ['studentId'],
    });
    const enrolledIds = new Set(
      enrolledStudentRows.map((row) => row.studentId),
    );

    const retainedMap = await this.loadRetainedCandidates(
      schoolId,
      academicYearId,
    );

    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        status: AcademicEntityStatus.ACTIVE,
        ...(filters.search
          ? {
              OR: [
                {
                  fullName: {
                    contains: filters.search,
                    mode: 'insensitive',
                  },
                },
                {
                  externalCode: {
                    contains: filters.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        externalCode: true,
        dateOfBirth: true,
        gender: true,
      },
      orderBy: { fullName: 'asc' },
    });

    const items: UnassignedPlacementItem[] = [];

    for (const student of students) {
      if (enrolledIds.has(student.id)) {
        continue;
      }

      const retained = retainedMap.get(student.id);
      const reason: PlacementReason = retained ? 'RETAINED' : 'NEW_INTAKE';

      if (filters.reason && filters.reason !== reason) {
        continue;
      }

      if (filters.gradeLevelId) {
        if (reason === 'RETAINED') {
          if (retained?.previousGradeLevelId !== filters.gradeLevelId) {
            continue;
          }
        }
        // NEW_INTAKE: gradeLevelId filter means "eligible to place into this grade"
        // keep them when listing for that grade / auto-balance
      }

      items.push({
        studentId: student.id,
        fullName: student.fullName,
        externalCode: student.externalCode,
        dateOfBirth: student.dateOfBirth
          ? toIsoDateString(student.dateOfBirth)
          : null,
        gender: student.gender,
        reason,
        previousHomeroomClassCode: retained?.previousHomeroomClassCode ?? null,
        previousGradeLevelId: retained?.previousGradeLevelId ?? null,
        previousGradeLevelCode: retained?.previousGradeLevelCode ?? null,
        previousAcademicYearName: retained?.previousAcademicYearName ?? null,
      });
    }

    return items;
  }

  private async loadRetainedCandidates(
    schoolId: string,
    targetAcademicYearId: string,
  ) {
    const summaries = await this.prisma.studentYearSummary.findMany({
      where: {
        schoolId,
        status: SummaryStatus.CLOSED,
        promotionDecision: PromotionDecision.RETAINED,
        academicYearId: { not: targetAcademicYearId },
      },
      select: {
        studentId: true,
        academicYear: { select: { id: true, name: true, startDate: true } },
        homeroomClass: {
          select: {
            code: true,
            gradeLevelId: true,
            gradeLevel: { select: { code: true } },
          },
        },
      },
      orderBy: { academicYear: { startDate: 'desc' } },
    });

    const map = new Map<
      string,
      {
        previousHomeroomClassCode: string;
        previousGradeLevelId: string;
        previousGradeLevelCode: string;
        previousAcademicYearName: string;
      }
    >();

    for (const summary of summaries) {
      if (map.has(summary.studentId)) {
        continue;
      }
      map.set(summary.studentId, {
        previousHomeroomClassCode: summary.homeroomClass.code,
        previousGradeLevelId: summary.homeroomClass.gradeLevelId,
        previousGradeLevelCode: summary.homeroomClass.gradeLevel.code,
        previousAcademicYearName: summary.academicYear.name,
      });
    }

    return map;
  }

  private async assertRetainedAssignmentsMatchGrade(
    schoolId: string,
    targetAcademicYearId: string,
    assignments: AssignClassPlacementInput['assignments'],
    classById: Map<
      string,
      { gradeLevelId: string; gradeLevelCode: string; code: string }
    >,
  ) {
    const retainedMap = await this.loadRetainedCandidates(
      schoolId,
      targetAcademicYearId,
    );

    for (const row of assignments) {
      const retained = retainedMap.get(row.studentId);
      if (!retained) {
        continue;
      }

      const targetClass = classById.get(row.homeroomClassId);
      if (!targetClass) {
        continue;
      }

      if (
        !isRetainedGradeCompatible(
          retained.previousGradeLevelId,
          targetClass.gradeLevelId,
        )
      ) {
        throw new AppException(
          'CLASS_PLACEMENT_GRADE_MISMATCH',
          `Học sinh ở lại khối ${retained.previousGradeLevelCode} không được xếp vào lớp ${targetClass.code} (khối ${targetClass.gradeLevelCode})`,
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }
  }

  private async assertStudentsUnassigned(
    schoolId: string,
    semesterId: string,
    studentIds: string[],
  ) {
    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        id: { in: studentIds },
        status: AcademicEntityStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (students.length !== studentIds.length) {
      throw new AppException(
        'STUDENT_NOT_FOUND',
        'Một hoặc nhiều học sinh không tồn tại hoặc không còn hoạt động',
        HttpStatus.NOT_FOUND,
      );
    }

    const existing = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId,
        studentId: { in: studentIds },
        status: { in: STUDENT_YEAR_ENROLLMENT_STATUSES },
      },
      select: { studentId: true },
    });

    if (existing.length > 0) {
      throw new AppException(
        'ENROLLMENT_ALREADY_ACTIVE',
        'Một hoặc nhiều học sinh đã có lớp trong học kỳ này',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async requireSemester(schoolId: string, semesterId: string) {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, schoolId },
      select: {
        id: true,
        academicYearId: true,
        startDate: true,
        code: true,
        name: true,
      },
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
}
