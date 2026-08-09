import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AssessmentStatus,
  AssessmentType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { getRegularAssessmentQuota } from '@/common/utils/assessment-quota.util';
import { GRADEBOOK_ENROLLMENT_STATUSES } from '@/common/utils/enrollment-status.util';
import {
  computeSemesterAverage,
  isAbsentScoreCell,
  isGradebookScoreCellComplete,
} from '@/common/utils/gradebook-average.util';
import { assessmentDetailInclude } from '@/modules/assessments/mappers/assessment.mapper';
import type {
  PortalGradebookGrid,
  PortalGradebookGridColumn,
  PortalGradebookGridRow,
} from '@/modules/portal/mappers/portal-gradebook.mapper';

@Injectable()
export class GradebookGridService {
  constructor(private readonly prisma: PrismaService) {}

  async getGradebookGridForCourseSection(
    schoolId: string,
    courseSectionId: string,
  ): Promise<PortalGradebookGrid> {
    const courseSection = await this.prisma.courseSection.findFirst({
      where: {
        id: courseSectionId,
        schoolId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        semesterId: true,
        homeroomClassId: true,
        semester: {
          select: {
            name: true,
            isCurrent: true,
            academicYearId: true,
            academicYear: { select: { id: true, name: true } },
          },
        },
        homeroomClass: { select: { code: true } },
        gradeLevelSubject: {
          select: {
            periodsPerYear: true,
            evaluationMode: true,
            subject: { select: { code: true, name: true } },
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

    const assessments = await this.prisma.assessment.findMany({
      where: {
        schoolId,
        courseSectionId,
      },
      include: assessmentDetailInclude,
    });

    const isLocked =
      assessments.length > 0 &&
      assessments.every(
        (assessment) => assessment.status === AssessmentStatus.CLOSED,
      );

    const columns = this.buildGradebookGridColumns(assessments, isLocked);
    const assessmentById = new Map(assessments.map((row) => [row.id, row]));

    const students = await this.loadGradebookGridStudents(
      schoolId,
      courseSection.semesterId,
      courseSection.homeroomClassId,
      assessments,
    );

    const rows = this.buildGradebookGridRows(
      columns,
      assessmentById,
      students,
      isLocked,
    );

    const subject = courseSection.gradeLevelSubject.subject;
    const gradeLevelSubject = courseSection.gradeLevelSubject;

    const regularTxPerYear =
      getRegularAssessmentQuota(
        gradeLevelSubject.periodsPerYear,
        gradeLevelSubject.evaluationMode,
      ) ?? 0;

    return {
      courseSectionId: courseSection.id,
      courseSectionCode: courseSection.code,
      courseSectionName: courseSection.name,
      semesterId: courseSection.semesterId,
      semesterName: courseSection.semester.name,
      semesterIsCurrent: courseSection.semester.isCurrent,
      academicYearId: courseSection.semester.academicYearId,
      academicYearName: courseSection.semester.academicYear.name,
      homeroomClassCode: courseSection.homeroomClass?.code ?? null,
      subjectCode: subject.code,
      subjectName: subject.name,
      periodsPerYear: gradeLevelSubject.periodsPerYear,
      regularTxPerYear,
      regularSlotsThisSemester: regularTxPerYear,
      isLocked,
      columns,
      rows,
    };
  }

  async assertGradebookReadyToLock(
    schoolId: string,
    courseSectionId: string,
  ): Promise<void> {
    const grid = await this.getGradebookGridForCourseSection(
      schoolId,
      courseSectionId,
    );

    if (grid.isLocked) {
      throw new AppException(
        'GRADEBOOK_ALREADY_LOCKED',
        'Sổ điểm đã được khóa',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const openColumns = grid.columns.filter(
      (column) => column.status === AssessmentStatus.OPEN,
    );

    if (openColumns.length === 0) {
      throw new AppException(
        'GRADEBOOK_NO_OPEN_ASSESSMENTS',
        'Không có đầu điểm nào đang mở để khóa',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    let incompleteCount = 0;

    for (const row of grid.rows) {
      for (const column of openColumns) {
        const cell = row.cells[column.slotKey];
        const complete = isGradebookScoreCellComplete(
          cell?.score ?? null,
          cell?.note ?? null,
          column.type,
        );

        if (!complete) {
          incompleteCount += 1;
        }
      }
    }

    if (incompleteCount > 0) {
      throw new AppException(
        'GRADEBOOK_INCOMPLETE_SCORES',
        `Chưa nhập đủ điểm (${incompleteCount} ô còn thiếu). Hoàn thiện tất cả đầu điểm trước khi khóa sổ.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  buildGradebookGridColumns(
    assessments: Array<
      Prisma.AssessmentGetPayload<{ include: typeof assessmentDetailInclude }>
    >,
    isLocked: boolean,
  ): PortalGradebookGridColumn[] {
    const byDateThenName = (
      a: (typeof assessments)[number],
      b: (typeof assessments)[number],
    ) =>
      a.assessmentDate.getTime() - b.assessmentDate.getTime() ||
      a.name.localeCompare(b.name, 'vi');

    const regular = assessments
      .filter((row) => row.type === AssessmentType.REGULAR)
      .sort(byDateThenName);
    const midterm = assessments
      .filter((row) => row.type === AssessmentType.MIDTERM)
      .sort(byDateThenName);
    const finalAssessments = assessments
      .filter((row) => row.type === AssessmentType.FINAL)
      .sort(byDateThenName);

    const columns: PortalGradebookGridColumn[] = [];

    regular.forEach((assessment, index) => {
      columns.push(
        this.toGradebookGridColumn(assessment, `TX${index + 1}`, isLocked),
      );
    });

    if (midterm[0]) {
      columns.push(this.toGradebookGridColumn(midterm[0], 'GK', isLocked));
    }

    if (finalAssessments[0]) {
      columns.push(
        this.toGradebookGridColumn(finalAssessments[0], 'CK', isLocked),
      );
    }

    return columns;
  }

  buildGradebookGridRows(
    columns: PortalGradebookGridColumn[],
    assessmentById: Map<
      string,
      Prisma.AssessmentGetPayload<{ include: typeof assessmentDetailInclude }>
    >,
    students: Array<{ id: string; fullName: string }>,
    isLocked: boolean,
  ): PortalGradebookGridRow[] {
    return students.map((student) => {
      const cells: PortalGradebookGridRow['cells'] = {};
      const averageInputs: Array<{
        type: AssessmentType;
        score: number | null;
      }> = [];

      for (const column of columns) {
        const assessment = assessmentById.get(column.assessmentId);
        const scoreRow = assessment?.scores?.find(
          (row) => row.studentId === student.id,
        );
        const score = scoreRow?.score?.toNumber() ?? null;
        const note = scoreRow?.note ?? null;

        cells[column.slotKey] = {
          scoreId: scoreRow?.id ?? '',
          score,
          note,
          absent: isAbsentScoreCell(score, note, column.type),
          editable: !isLocked,
        };
        averageInputs.push({ type: column.type, score });
      }

      return {
        studentId: student.id,
        studentFullName: student.fullName,
        cells,
        semesterAverage: computeSemesterAverage(averageInputs),
      };
    });
  }

  private toGradebookGridColumn(
    assessment: Prisma.AssessmentGetPayload<{
      include: typeof assessmentDetailInclude;
    }>,
    slotKey: string,
    isLocked: boolean,
  ): PortalGradebookGridColumn {
    return {
      slotKey,
      assessmentId: assessment.id,
      type: assessment.type,
      name: assessment.name,
      assessmentDate: assessment.assessmentDate.toISOString().slice(0, 10),
      maxScore: assessment.maxScore.toNumber(),
      status: assessment.status,
      editable: !isLocked,
    };
  }

  private async loadGradebookGridStudents(
    schoolId: string,
    semesterId: string,
    homeroomClassId: string | null,
    assessments: Array<
      Prisma.AssessmentGetPayload<{ include: typeof assessmentDetailInclude }>
    >,
  ): Promise<Array<{ id: string; fullName: string }>> {
    if (homeroomClassId) {
      const enrollments = await this.prisma.studentEnrollment.findMany({
        where: {
          schoolId,
          semesterId,
          homeroomClassId,
          status: { in: GRADEBOOK_ENROLLMENT_STATUSES },
        },
        include: {
          student: {
            select: { id: true, fullName: true },
          },
        },
        orderBy: { student: { fullName: 'asc' } },
      });

      return enrollments.map((row) => row.student);
    }

    const studentMap = new Map<string, { id: string; fullName: string }>();

    for (const assessment of assessments) {
      for (const score of assessment.scores ?? []) {
        studentMap.set(score.studentId, {
          id: score.studentId,
          fullName: score.student.fullName,
        });
      }
    }

    return [...studentMap.values()].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, 'vi'),
    );
  }
}
