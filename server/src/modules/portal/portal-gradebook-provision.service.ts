import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AssessmentStatus,
  AssessmentType,
  Prisma,
} from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { getRegularAssessmentQuota } from '@/common/utils/assessment-quota.util';
import { ScoresService } from '@/modules/scores/scores.service';

const GRADEBOOK_MAX_SCORE = 10;

@Injectable()
export class PortalGradebookProvisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoresService: ScoresService,
  ) {}

  async ensureGradebookProvisioned(
    schoolId: string,
    courseSectionId: string,
    teacherId: string,
  ): Promise<void> {
    const context = await this.prisma.courseSection.findFirst({
      where: { id: courseSectionId, schoolId },
      select: {
        id: true,
        semesterId: true,
        semester: {
          select: { startDate: true, endDate: true },
        },
        gradeLevelSubject: {
          select: {
            periodsPerYear: true,
            evaluationMode: true,
          },
        },
      },
    });

    if (!context) {
      throw new AppException(
        'COURSE_SECTION_NOT_FOUND',
        'Không tìm thấy lớp môn học',
        HttpStatus.NOT_FOUND,
      );
    }

    // Số lượng điểm thường xuyên dựa theo số tiết 1 năm của môn học
    const txQuota = getRegularAssessmentQuota(
      context.gradeLevelSubject.periodsPerYear,
      context.gradeLevelSubject.evaluationMode,
    );

    if (txQuota == null) {
      throw new AppException(
        'GRADE_LEVEL_SUBJECT_PERIODS_NOT_CONFIGURED',
        'Chưa cấu hình số tiết/năm cho môn theo khối — liên hệ quản trị viên',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const existing = await this.prisma.assessment.findMany({
      where: { schoolId, courseSectionId },
      orderBy: [{ assessmentDate: 'asc' }, { name: 'asc' }],
    });

    const existingRegular = existing.filter(
      (row) => row.type === AssessmentType.REGULAR,
    );
    const hasMidterm = existing.some(
      (row) => row.type === AssessmentType.MIDTERM,
    );
    const hasFinal = existing.some((row) => row.type === AssessmentType.FINAL);

    const semesterStart = context.semester.startDate;
    const semesterEnd = context.semester.endDate;
    const semesterMidpoint = this.offsetDate(
      semesterStart,
      Math.floor(this.daysBetween(semesterStart, semesterEnd) / 2),
    );

    for (let index = existingRegular.length; index < txQuota; index += 1) {
      const slotNumber = index + 1;
      await this.createSlotAssessment({
        schoolId,
        semesterId: context.semesterId,
        courseSectionId,
        teacherId,
        type: AssessmentType.REGULAR,
        name: `Điểm TX ${slotNumber}`,
        assessmentDate: this.offsetDate(semesterStart, index * 28),
      });
    }

    if (!hasMidterm) {
      await this.createSlotAssessment({
        schoolId,
        semesterId: context.semesterId,
        courseSectionId,
        teacherId,
        type: AssessmentType.MIDTERM,
        name: 'Kiểm tra giữa kỳ',
        assessmentDate: semesterMidpoint,
      });
    }

    if (!hasFinal) {
      await this.createSlotAssessment({
        schoolId,
        semesterId: context.semesterId,
        courseSectionId,
        teacherId,
        type: AssessmentType.FINAL,
        name: 'Kiểm tra cuối kỳ',
        assessmentDate: this.offsetDate(semesterEnd, -7),
      });
    }

    const assessments = await this.prisma.assessment.findMany({
      where: { schoolId, courseSectionId },
      include: { _count: { select: { scores: true } } },
    });

    for (const assessment of assessments) {
      if (assessment._count.scores === 0) {
        await this.scoresService.initializeAssessmentScores(
          schoolId,
          assessment.id,
        );
      }
    }
  }

  private async createSlotAssessment(input: {
    schoolId: string;
    semesterId: string;
    courseSectionId: string;
    teacherId: string;
    type: AssessmentType;
    name: string;
    assessmentDate: Date;
  }) {
    try {
      await this.prisma.assessment.create({
        data: {
          schoolId: input.schoolId,
          semesterId: input.semesterId,
          courseSectionId: input.courseSectionId,
          teacherId: input.teacherId,
          type: input.type,
          name: input.name,
          assessmentDate: input.assessmentDate,
          maxScore: new Prisma.Decimal(GRADEBOOK_MAX_SCORE),
          status: AssessmentStatus.OPEN,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }

      throw error;
    }
  }

  private offsetDate(base: Date, dayOffset: number): Date {
    const result = new Date(base);
    result.setUTCDate(result.getUTCDate() + dayOffset);
    return result;
  }

  private daysBetween(start: Date, end: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / msPerDay),
    );
  }
}
