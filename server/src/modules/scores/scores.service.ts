import { HttpStatus, Injectable } from '@nestjs/common';
import { AssessmentStatus, Prisma } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { GRADEBOOK_ENROLLMENT_STATUSES } from '@/common/utils/enrollment-status.util';
import { PrismaService } from '@/common/database/prisma.service';
import { isValidScoreStep } from '@/common/utils/score-step.util';
import {
  assessmentDetailInclude,
  toAssessmentDetailResponse,
  type AssessmentDetailResponse,
} from '@/modules/assessments/mappers/assessment.mapper';
import { AssessmentsService } from '@/modules/assessments/assessments.service';
import type { BulkUpsertScoresInput } from '@/modules/scores/schemas/score.schema';

@Injectable()
export class ScoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessmentsService: AssessmentsService,
  ) {}

  async bulkUpsert(
    schoolId: string,
    assessmentId: string,
    input: BulkUpsertScoresInput,
  ): Promise<AssessmentDetailResponse> {
    await this.assessmentsService.assertAssessmentOpen(schoolId, assessmentId);

    const assessment = await this.findAssessmentForScores(
      schoolId,
      assessmentId,
    );

    const enrolledStudentIds = await this.getEnrolledStudentIds(
      schoolId,
      assessment.semesterId,
      assessment.courseSection.homeroomClassId,
    );

    const maxScore = assessment.maxScore.toNumber();

    for (const row of input.scores) {
      if (!enrolledStudentIds.has(row.studentId)) {
        throw new AppException(
          'STUDENT_NOT_ENROLLED',
          'Học sinh không thuộc lớp hành chính của lớp môn',
          HttpStatus.UNPROCESSABLE_ENTITY,
          [{ field: 'scores.studentId', message: row.studentId }],
        );
      }

      if (row.score != null && row.score > maxScore) {
        throw new AppException(
          'SCORE_OUT_OF_RANGE',
          `Điểm phải nằm trong [0, ${maxScore}]`,
          HttpStatus.UNPROCESSABLE_ENTITY,
          [{ field: 'scores.score', message: String(row.score) }],
        );
      }

      if (row.score != null && !isValidScoreStep(row.score)) {
        throw new AppException(
          'SCORE_INVALID_STEP',
          'Điểm chỉ được là số nguyên hoặc .25, .5, .75',
          HttpStatus.UNPROCESSABLE_ENTITY,
          [{ field: 'scores.score', message: String(row.score) }],
        );
      }
    }

    await this.prisma.$transaction(
      input.scores.map((row) =>
        this.prisma.score.update({
          where: {
            assessmentId_studentId: {
              assessmentId,
              studentId: row.studentId,
            },
          },
          data: {
            score: row.score == null ? null : new Prisma.Decimal(row.score),
            ...(row.note !== undefined ? { note: row.note } : {}),
          },
        }),
      ),
    );

    return this.getAssessmentDetail(schoolId, assessmentId);
  }

  async patchGradebookChanges(
    schoolId: string,
    courseSectionId: string,
    changes: Array<{
      assessmentId: string;
      studentId: string;
      score: number | null;
      note?: string | null;
    }>,
  ): Promise<void> {
    // lấy ra thông tin các đầu điểm của lớp môn
    const assessments = await this.prisma.assessment.findMany({
      where: { schoolId, courseSectionId },
      select: {
        id: true,
        status: true,
        maxScore: true,
        semesterId: true,
        courseSection: { select: { homeroomClassId: true } },
      },
    });

    if (assessments.length === 0) {
      throw new AppException(
        'ASSESSMENT_NOT_FOUND',
        'Sổ điểm chưa có đầu điểm',
        HttpStatus.NOT_FOUND,
      );
    }

    // Xem điểm đã bị khóa chưa
    const isLocked = assessments.every(
      (assessment) => assessment.status === AssessmentStatus.CLOSED,
    );
    if (isLocked) {
      throw new AppException(
        'GRADEBOOK_LOCKED',
        'Sổ điểm đã khóa — không thể sửa điểm',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const assessmentMap = new Map(assessments.map((row) => [row.id, row]));

    const enrolledCache = new Map<string, Set<string>>();

    for (const change of changes) {
      // Check xem đầu điểm có phải của lớp này không
      const assessment = assessmentMap.get(change.assessmentId);
      if (!assessment) {
        throw new AppException(
          'ASSESSMENT_NOT_FOUND',
          'Đầu điểm không thuộc lớp môn này',
          HttpStatus.UNPROCESSABLE_ENTITY,
          [{ field: 'changes.assessmentId', message: change.assessmentId }],
        );
      }

      const cacheKey = `${assessment.semesterId}:${assessment.courseSection.homeroomClassId}`;
      if (!enrolledCache.has(cacheKey)) {
        // Lấy ra danh sách học sinh của lớp đó trong năm học kỳ đó
        const enrolled = await this.getEnrolledStudentIds(
          schoolId,
          assessment.semesterId,
          assessment.courseSection.homeroomClassId,
        );
        // Đưa vào cache để không cần query xuống DB để check HS đó có trong lớp này không nhiều lần
        enrolledCache.set(cacheKey, enrolled);
      }

      // Check trong cache thay vì DB
      if (!enrolledCache.get(cacheKey)?.has(change.studentId)) {
        throw new AppException(
          'STUDENT_NOT_ENROLLED',
          'Học sinh không thuộc lớp hành chính của lớp môn',
          HttpStatus.UNPROCESSABLE_ENTITY,
          [{ field: 'changes.studentId', message: change.studentId }],
        );
      }

      const maxScore = assessment.maxScore.toNumber();
      if (change.score != null && change.score > maxScore) {
        throw new AppException(
          'SCORE_OUT_OF_RANGE',
          `Điểm phải nằm trong [0, ${maxScore}]`,
          HttpStatus.UNPROCESSABLE_ENTITY,
          [{ field: 'changes.score', message: String(change.score) }],
        );
      }

      if (change.score != null && !isValidScoreStep(change.score)) {
        throw new AppException(
          'SCORE_INVALID_STEP',
          'Điểm chỉ được là số nguyên hoặc .25, .5, .75',
          HttpStatus.UNPROCESSABLE_ENTITY,
          [{ field: 'changes.score', message: String(change.score) }],
        );
      }
    }

    await this.prisma.$transaction(
      changes.map((change) =>
        this.prisma.score.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId: change.assessmentId,
              studentId: change.studentId,
            },
          },
          create: {
            schoolId,
            assessmentId: change.assessmentId,
            studentId: change.studentId,
            score:
              change.score == null ? null : new Prisma.Decimal(change.score),
            note: change.note ?? null,
          },
          update: {
            score:
              change.score == null ? null : new Prisma.Decimal(change.score),
            ...(change.note !== undefined ? { note: change.note } : {}),
          },
        }),
      ),
    );
  }

  async initializeAssessmentScores(
    schoolId: string,
    assessmentId: string,
  ): Promise<AssessmentDetailResponse> {
    const assessment = await this.findAssessmentForScores(
      schoolId,
      assessmentId,
    );

    const enrolledStudentIds = await this.getEnrolledStudentIds(
      schoolId,
      assessment.semesterId,
      assessment.courseSection.homeroomClassId,
    );

    await this.prisma.score.createMany({
      data: [...enrolledStudentIds].map((studentId) => ({
        schoolId,
        assessmentId,
        studentId,
        score: null,
      })),
      skipDuplicates: true,
    });

    return this.getAssessmentDetail(schoolId, assessmentId);
  }

  private async getEnrolledStudentIds(
    schoolId: string,
    semesterId: string,
    homeroomClassId: string | null,
  ): Promise<Set<string>> {
    if (!homeroomClassId) {
      throw new AppException(
        'COURSE_SECTION_NO_HOMEROOM',
        'Lớp môn chưa gắn lớp hành chính — không thể nhập điểm',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId,
        homeroomClassId,
        status: { in: GRADEBOOK_ENROLLMENT_STATUSES },
      },
      select: { studentId: true },
    });

    if (enrollments.length === 0) {
      throw new AppException(
        'NO_ACTIVE_ENROLLMENTS',
        'Không có học sinh ghi danh trong lớp hành chính cho học kỳ này',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return new Set(enrollments.map((enrollment) => enrollment.studentId));
  }

  private async findAssessmentForScores(
    schoolId: string,
    assessmentId: string,
  ) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
      select: {
        id: true,
        semesterId: true,
        maxScore: true,
        courseSection: {
          select: { homeroomClassId: true },
        },
      },
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

  private async getAssessmentDetail(
    schoolId: string,
    assessmentId: string,
  ): Promise<AssessmentDetailResponse> {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
      include: assessmentDetailInclude,
    });

    if (!assessment) {
      throw new AppException(
        'ASSESSMENT_NOT_FOUND',
        'Không tìm thấy đầu điểm',
        HttpStatus.NOT_FOUND,
      );
    }

    return toAssessmentDetailResponse(assessment);
  }
}
