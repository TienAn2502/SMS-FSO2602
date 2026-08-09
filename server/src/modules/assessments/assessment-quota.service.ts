import { HttpStatus, Injectable } from '@nestjs/common';
import { AssessmentType } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import {
  FINAL_ASSESSMENT_QUOTA,
  getRegularAssessmentQuota,
  getRegularQuotaDescription,
  MIDTERM_ASSESSMENT_QUOTA,
} from '@/common/utils/assessment-quota.util';

export interface AssessmentQuotaSnapshot {
  courseSectionId: string;
  evaluationMode: 'NUMERIC' | 'PASS_FAIL';
  periodsPerYear: number | null;
  regularQuota: number | null;
  regularUsed: number;
  midtermQuota: number;
  midtermUsed: number;
  finalQuota: number;
  finalUsed: number;
  regularDescription: string;
  canCreateRegular: boolean;
  canCreateMidterm: boolean;
  canCreateFinal: boolean;
}

@Injectable()
export class AssessmentQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuotaForCourseSection(
    schoolId: string,
    courseSectionId: string,
  ): Promise<AssessmentQuotaSnapshot> {
    const context = await this.loadCourseSectionContext(
      schoolId,
      courseSectionId,
    );
    const counts = await this.countAssessments(schoolId, context);
    const regularQuota = getRegularAssessmentQuota(
      context.gradeLevelSubject.periodsPerYear,
      context.gradeLevelSubject.evaluationMode,
    );

    return {
      courseSectionId: context.id,
      evaluationMode: context.gradeLevelSubject.evaluationMode,
      periodsPerYear: context.gradeLevelSubject.periodsPerYear,
      regularQuota,
      regularUsed: counts.regular,
      midtermQuota: MIDTERM_ASSESSMENT_QUOTA,
      midtermUsed: counts.midterm,
      finalQuota: FINAL_ASSESSMENT_QUOTA,
      finalUsed: counts.final,
      regularDescription: getRegularQuotaDescription(
        context.gradeLevelSubject.periodsPerYear,
        context.gradeLevelSubject.evaluationMode,
        regularQuota,
      ),
      canCreateRegular:
        regularQuota != null && counts.regular < regularQuota,
      canCreateMidterm: counts.midterm < MIDTERM_ASSESSMENT_QUOTA,
      canCreateFinal: counts.final < FINAL_ASSESSMENT_QUOTA,
    };
  }

  async assertCanCreate(
    schoolId: string,
    courseSectionId: string,
    type: AssessmentType,
  ): Promise<void> {
    const quota = await this.getQuotaForCourseSection(
      schoolId,
      courseSectionId,
    );

    if (type === AssessmentType.MIDTERM) {
      if (!quota.canCreateMidterm) {
        throw new AppException(
          'ASSESSMENT_MIDTERM_LIMIT',
          'Lớp môn đã có điểm giữa kỳ trong học kỳ này',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      return;
    }

    if (type === AssessmentType.FINAL) {
      if (!quota.canCreateFinal) {
        throw new AppException(
          'ASSESSMENT_FINAL_LIMIT',
          'Lớp môn đã có điểm cuối kỳ trong học kỳ này',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      return;
    }

    if (quota.regularQuota == null) {
      throw new AppException(
        'GRADE_LEVEL_SUBJECT_PERIODS_NOT_CONFIGURED',
        'Chưa cấu hình số tiết/năm cho môn theo khối — liên hệ quản trị viên',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!quota.canCreateRegular) {
      throw new AppException(
        'ASSESSMENT_REGULAR_LIMIT',
        quota.evaluationMode === 'PASS_FAIL'
          ? 'Môn đạt/chưa đạt chỉ có tối đa 2 đầu điểm thường xuyên/năm học'
          : `Đã đạt tối đa ${quota.regularQuota} đầu điểm thường xuyên/năm học (${quota.regularDescription})`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async loadCourseSectionContext(
    schoolId: string,
    courseSectionId: string,
  ) {
    const courseSection = await this.prisma.courseSection.findFirst({
      where: { id: courseSectionId, schoolId },
      select: {
        id: true,
        homeroomClassId: true,
        gradeLevelSubjectId: true,
        semester: { select: { academicYearId: true } },
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

    return courseSection;
  }

  private async countAssessments(
    schoolId: string,
    context: Awaited<
      ReturnType<AssessmentQuotaService['loadCourseSectionContext']>
    >,
  ) {
    const regularCourseSectionIds =
      await this.getCourseSectionIdsForRegularQuota(schoolId, context);

    const [regular, midterm, finalCount] = await this.prisma.$transaction([
      this.prisma.assessment.count({
        where: {
          schoolId,
          courseSectionId: { in: regularCourseSectionIds },
          type: AssessmentType.REGULAR,
        },
      }),
      this.prisma.assessment.count({
        where: {
          schoolId,
          courseSectionId: context.id,
          type: AssessmentType.MIDTERM,
        },
      }),
      this.prisma.assessment.count({
        where: {
          schoolId,
          courseSectionId: context.id,
          type: AssessmentType.FINAL,
        },
      }),
    ]);

    return { regular, midterm, final: finalCount };
  }

  private async getCourseSectionIdsForRegularQuota(
    schoolId: string,
    context: Awaited<
      ReturnType<AssessmentQuotaService['loadCourseSectionContext']>
    >,
  ): Promise<string[]> {
    if (!context.homeroomClassId) {
      return [context.id];
    }

    const courseSections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        homeroomClassId: context.homeroomClassId,
        gradeLevelSubjectId: context.gradeLevelSubjectId,
        semester: { academicYearId: context.semester.academicYearId },
      },
      select: { id: true },
    });

    return courseSections.map((section) => section.id);
  }
}
