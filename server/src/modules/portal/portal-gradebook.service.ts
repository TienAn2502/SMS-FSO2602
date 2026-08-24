import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcademicEntityStatus,
  AssessmentStatus,
  AssessmentType,
  Prisma,
} from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { GRADEBOOK_ENROLLMENT_STATUSES } from '@/common/utils/enrollment-status.util';
import type { PaginationMeta } from '@/common/types/api-response.types';
import { STUDENT_SCORES_TX_COLUMN_COUNT } from '@/common/utils/assessment-quota.util';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import { assessmentDetailInclude } from '@/modules/assessments/mappers/assessment.mapper';
import {
  toPortalGradebookClassSummary,
  toPortalMyScoreItem,
  type PortalGradebookClassSummary,
  type PortalGradebookGrid,
  type PortalGradebookGridColumn,
  type PortalGradebookGridRow,
  type PortalMyScoreItem,
  type PortalStudentScoresGrid,
  type PortalStudentScoresGridColumn,
  type PortalStudentScoresGridRow,
} from '@/modules/portal/mappers/portal-gradebook.mapper';
import { PortalGradebookProvisionService } from '@/modules/portal/portal-gradebook-provision.service';
import { GradebookGridService } from '@/modules/gradebook-grid/gradebook-grid.service';
import type {
  PortalGradebookExportQuery,
  PortalMyGradebookClassesQuery,
  PortalMyScoresGridQuery,
  PortalMyScoresQuery,
  PortalPatchGradebookScoresInput,
} from '@/modules/portal/schemas/portal-gradebook.schema';
import { GradeSummariesService } from '@/modules/grade-summaries/grade-summaries.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { ParentsService } from '@/modules/parents/parents.service';
import { ScoresService } from '@/modules/scores/scores.service';
import { SemestersService } from '@/modules/semesters/semesters.service';
import {
  GradebookExportService,
  type GradebookExportFile,
} from '@/modules/exports/gradebook-export.service';
import {
  ExportsPdfService,
  type PdfExportFile,
} from '@/modules/exports/exports-pdf.service';
import { CourseSectionsService } from '@/modules/course-sections/course-sections.service';

function clampFakeScore(value: number): number {
  const clamped = Math.max(4, Math.min(9.5, value));
  return Math.round(clamped * 4) / 4;
}

function pickFakeScore(studentIndex: number, slotIndex: number): number {
  const tier = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9][studentIndex % 10] ?? 7;
  const noise = (((studentIndex * 3 + slotIndex * 5) % 7) - 3) * 0.25;
  return clampFakeScore(tier + noise);
}

@Injectable()
export class PortalGradebookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parentsService: ParentsService,
    private readonly semestersService: SemestersService,
    private readonly gradebookProvisionService: PortalGradebookProvisionService,
    private readonly scoresService: ScoresService,
    private readonly gradeSummariesService: GradeSummariesService,
    private readonly gradebookGridService: GradebookGridService,
    private readonly gradebookExportService: GradebookExportService,
    private readonly exportsPdfService: ExportsPdfService,
    private readonly notificationsService: NotificationsService,
    private readonly courseSectionsService: CourseSectionsService,
  ) {}

  async getMyGradebookClasses(
    user: AuthenticatedUser,
    query: PortalMyGradebookClassesQuery,
  ): Promise<PortalGradebookClassSummary[]> {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    const academicYearId =
      query.academicYearId ??
      (await this.findCurrentAcademicYearId(user.activeSchoolId));

    const assignments = await this.prisma.teachingAssignment.findMany({
      where: {
        schoolId: user.activeSchoolId,
        teacherId: teacher.id,
        status: AcademicEntityStatus.ACTIVE,
        courseSection: {
          semester: {
            academicYearId,
          },
        },
      },
      select: {
        courseSectionId: true,
        courseSection: {
          select: {
            id: true,
            code: true,
            name: true,
            semesterId: true,
            semester: { select: { name: true, code: true } },
            homeroomClass: { select: { code: true } },
            gradeLevelSubject: {
              select: {
                subject: { select: { code: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: [
        { courseSection: { code: 'asc' } },
        { courseSection: { semester: { code: 'asc' } } },
      ],
    });

    if (assignments.length === 0) {
      return [];
    }

    return assignments.map((assignment) =>
      toPortalGradebookClassSummary(assignment),
    );
  }

  private async findCurrentAcademicYearId(schoolId: string): Promise<string> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: {
        schoolId,
        isCurrent: true,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!academicYear) {
      throw new AppException(
        'ACADEMIC_YEAR_NOT_FOUND',
        'Không tìm thấy năm học hiện tại',
        HttpStatus.NOT_FOUND,
      );
    }

    return academicYear.id;
  }

  async getMyGradebookGrid(
    user: AuthenticatedUser,
    courseSectionId: string,
  ): Promise<PortalGradebookGrid> {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    await this.assertTeacherAssignedToCourseSection(
      user.activeSchoolId,
      teacher.id,
      courseSectionId,
    );

    await this.gradebookProvisionService.ensureGradebookProvisioned(
      user.activeSchoolId,
      courseSectionId,
      teacher.id,
    );

    return this.gradebookGridService.getGradebookGridForCourseSection(
      user.activeSchoolId,
      courseSectionId,
    );
  }

  async patchMyGradebookScores(
    user: AuthenticatedUser,
    courseSectionId: string,
    input: PortalPatchGradebookScoresInput,
  ): Promise<void> {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    await this.assertTeacherAssignedToCourseSection(
      user.activeSchoolId,
      teacher.id,
      courseSectionId,
    );

    await this.assertGradebookSemesterIsCurrent(
      user.activeSchoolId,
      courseSectionId,
    );

    const [courseSection, assessmentNames] = await Promise.all([
      this.prisma.courseSection.findUniqueOrThrow({
        where: { id: courseSectionId },
        select: { name: true },
      }),
      this.getChangedAssessmentNames(
        user.activeSchoolId,
        courseSectionId,
        input.changes,
      ),
    ]);

    await this.scoresService.patchGradebookChanges(
      user.activeSchoolId,
      courseSectionId,
      input.changes,
    );

    // Gửi thông báo cho phụ huynh về việc cập nhật điểm
    if (assessmentNames.length > 0) {
      const uniqueAssessmentNames = [...new Set(assessmentNames)];

      await this.notificationsService.scoreNotification(
        user.activeSchoolId,
        user.id,
        courseSectionId,
        courseSection.name,
        'UPDATED',
        uniqueAssessmentNames,
      );
    }
  }

  private async getChangedAssessmentNames(
    schoolId: string,
    courseSectionId: string,
    changes: Array<{
      assessmentId: string;
      studentId: string;
      score: number | null;
      note?: string | null;
    }>,
  ): Promise<string[]> {
    if (changes.length === 0) return [];

    const assessmentIds = [...new Set(changes.map((c) => c.assessmentId))];
    const assessments = await this.prisma.assessment.findMany({
      where: { schoolId, id: { in: assessmentIds }, courseSectionId },
      select: { id: true, name: true },
    });

    return assessmentIds
      .map((id) => assessments.find((a) => a.id === id)?.name)
      .filter((name): name is string => name !== undefined);
  }

  async lockMyGradebook(
    user: AuthenticatedUser,
    courseSectionId: string,
  ): Promise<{ lockedAssessmentCount: number }> {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    await this.assertTeacherAssignedToCourseSection(
      user.activeSchoolId,
      teacher.id,
      courseSectionId,
    );

    await this.assertGradebookSemesterIsCurrent(
      user.activeSchoolId,
      courseSectionId,
    );

    await this.gradebookGridService.assertGradebookReadyToLock(
      user.activeSchoolId,
      courseSectionId,
    );

    const courseSectionName = await this.courseSectionsService.findById(
      user.activeSchoolId,
      courseSectionId,
    );

    const result = await this.prisma.assessment.updateMany({
      where: {
        schoolId: user.activeSchoolId,
        courseSectionId,
        status: AssessmentStatus.OPEN,
      },
      data: {
        status: AssessmentStatus.CLOSED,
      },
    });

    if (result.count > 0) {
      await this.gradeSummariesService.onGradebookLocked(
        user.activeSchoolId,
        courseSectionId,
      );

      await this.notificationsService.scoreNotification(
        user.activeSchoolId,
        user.id,
        courseSectionId,
        courseSectionName.name,
        'LOCKED',
      );
    }

    return { lockedAssessmentCount: result.count };
  }

  async fillFakeMyGradebookScores(
    user: AuthenticatedUser,
    courseSectionId: string,
  ): Promise<{ filledCount: number }> {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    await this.assertTeacherAssignedToCourseSection(
      user.activeSchoolId,
      teacher.id,
      courseSectionId,
    );

    await this.assertGradebookSemesterIsCurrent(
      user.activeSchoolId,
      courseSectionId,
    );

    await this.gradebookProvisionService.ensureGradebookProvisioned(
      user.activeSchoolId,
      courseSectionId,
      teacher.id,
    );

    const courseSection = await this.prisma.courseSection.findFirst({
      where: { id: courseSectionId, schoolId: user.activeSchoolId },
      select: {
        semesterId: true,
        homeroomClassId: true,
      },
    });

    if (!courseSection?.homeroomClassId) {
      throw new AppException(
        'COURSE_SECTION_NO_HOMEROOM',
        'Lớp môn chưa gắn lớp hành chính',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const assessments = await this.prisma.assessment.findMany({
      where: {
        schoolId: user.activeSchoolId,
        courseSectionId,
        status: AssessmentStatus.OPEN,
      },
      select: { id: true, type: true, assessmentDate: true, name: true },
      orderBy: [{ assessmentDate: 'asc' }, { name: 'asc' }],
    });

    if (assessments.length === 0) {
      throw new AppException(
        'NO_OPEN_ASSESSMENTS',
        'Không có đầu điểm đang mở để điền điểm mẫu',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId: user.activeSchoolId,
        semesterId: courseSection.semesterId,
        homeroomClassId: courseSection.homeroomClassId,
        status: { in: [...GRADEBOOK_ENROLLMENT_STATUSES] },
      },
      orderBy: { student: { fullName: 'asc' } },
      select: { studentId: true },
    });

    if (enrollments.length === 0) {
      throw new AppException(
        'NO_ENROLLMENTS',
        'Lớp chưa có học sinh để điền điểm',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const changes: Array<{
      assessmentId: string;
      studentId: string;
      score: number;
      note: null;
    }> = [];

    enrollments.forEach((enrollment, studentIndex) => {
      assessments.forEach((assessment, slotIndex) => {
        changes.push({
          assessmentId: assessment.id,
          studentId: enrollment.studentId,
          score: pickFakeScore(studentIndex, slotIndex),
          note: null,
        });
      });
    });

    await this.scoresService.patchGradebookChanges(
      user.activeSchoolId,
      courseSectionId,
      changes,
    );

    return { filledCount: changes.length };
  }

  async exportMyGradebook(
    user: AuthenticatedUser,
    courseSectionId: string,
    query: PortalGradebookExportQuery,
  ): Promise<GradebookExportFile> {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    await this.assertTeacherAssignedToCourseSection(
      user.activeSchoolId,
      teacher.id,
      courseSectionId,
    );

    await this.gradebookProvisionService.ensureGradebookProvisioned(
      user.activeSchoolId,
      courseSectionId,
      teacher.id,
    );

    return this.gradebookExportService.exportGradebook(
      user.activeSchoolId,
      courseSectionId,
      query,
    );
  }

  async exportMyGradebookPdf(
    user: AuthenticatedUser,
    courseSectionId: string,
  ): Promise<PdfExportFile> {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    await this.assertTeacherAssignedToCourseSection(
      user.activeSchoolId,
      teacher.id,
      courseSectionId,
    );

    await this.gradebookProvisionService.ensureGradebookProvisioned(
      user.activeSchoolId,
      courseSectionId,
      teacher.id,
    );

    return this.exportsPdfService.exportGradebookPdf(
      user.activeSchoolId,
      courseSectionId,
    );
  }

  async exportMyScoresPdf(
    user: AuthenticatedUser,
    query: PortalMyScoresGridQuery,
  ): Promise<PdfExportFile> {
    const student = await this.findStudentProfileByUserId(
      user.activeSchoolId,
      user.id,
    );
    const grid = await this.buildStudentScoresGrid(
      user.activeSchoolId,
      student,
      query,
    );

    return this.exportsPdfService.exportStudentScoresPdf(
      user.activeSchoolId,
      grid,
      student.fullName,
      student.externalCode ?? undefined,
    );
  }

  async exportMyChildScoresPdf(
    user: AuthenticatedUser,
    studentId: string,
    query: PortalMyScoresGridQuery,
  ): Promise<PdfExportFile> {
    const student = await this.findStudentForParent(
      user.activeSchoolId,
      user.id,
      studentId,
    );
    const grid = await this.buildStudentScoresGrid(
      user.activeSchoolId,
      student,
      query,
    );

    return this.exportsPdfService.exportStudentScoresPdf(
      user.activeSchoolId,
      grid,
      student.fullName,
      student.externalCode ?? undefined,
    );
  }

  async getMyScoresGrid(
    user: AuthenticatedUser,
    query: PortalMyScoresGridQuery,
  ): Promise<PortalStudentScoresGrid> {
    const student = await this.findStudentProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    return this.buildStudentScoresGrid(user.activeSchoolId, student, query);
  }

  async getMyChildScoresGrid(
    user: AuthenticatedUser,
    studentId: string,
    query: PortalMyScoresGridQuery,
  ): Promise<PortalStudentScoresGrid> {
    const student = await this.findStudentForParent(
      user.activeSchoolId,
      user.id,
      studentId,
    );

    return this.buildStudentScoresGrid(user.activeSchoolId, student, query);
  }

  private async buildStudentScoresGrid(
    schoolId: string,
    student: { id: string; fullName: string },
    query: PortalMyScoresGridQuery,
  ): Promise<PortalStudentScoresGrid> {
    const semester = await this.resolveSemesterForScoresGrid(
      schoolId,
      query.semesterId,
      query.academicYearId,
    );

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Không tìm thấy học kỳ',
        HttpStatus.NOT_FOUND,
      );
    }

    // Lấy ra thông tin enrollment của học sinh trong năm học kỳ đó
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        schoolId,
        studentId: student.id,
        semesterId: semester.id,
        status: { in: GRADEBOOK_ENROLLMENT_STATUSES },
      },
      include: {
        homeroomClass: { select: { code: true } },
      },
    });

    if (!enrollment?.homeroomClassId) {
      return {
        semesterId: semester.id,
        semesterName: semester.name,
        academicYearId: semester.academicYearId,
        academicYearName: semester.academicYear.name,
        homeroomClassCode: null,
        columns: this.buildStudentScoresGridColumns(),
        rows: [],
      };
    }

    // Lấy ra lớp môn học trong học kỳ đó mà học sinh đó học
    const courseSections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        semesterId: semester.id,
        homeroomClassId: enrollment.homeroomClassId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
        name: true,
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
            teacher: { select: { fullName: true } },
          },
        },
      },
      orderBy: [
        { gradeLevelSubject: { subject: { name: 'asc' } } },
        { code: 'asc' },
      ],
    });

    const gridRows: PortalStudentScoresGridRow[] = [];

    for (const courseSection of courseSections) {
      // Lấy ra danh sách đầu điểm của lớp môn học đó
      const assessments = await this.prisma.assessment.findMany({
        where: {
          schoolId,
          courseSectionId: courseSection.id,
        },
        include: assessmentDetailInclude,
      });

      const isLocked =
        assessments.length > 0 &&
        assessments.every(
          (assessment) => assessment.status === AssessmentStatus.CLOSED,
        );
      const columns = this.gradebookGridService.buildGradebookGridColumns(
        assessments,
        isLocked,
      );
      const assessmentById = new Map(assessments.map((row) => [row.id, row]));
      const gradebookRows = this.gradebookGridService.buildGradebookGridRows(
        columns,
        assessmentById,
        [{ id: student.id, fullName: student.fullName }],
        isLocked,
      );
      const gradebookRow = gradebookRows[0] ?? {
        studentId: student.id,
        studentFullName: student.fullName,
        cells: {},
        semesterAverage: null,
      };

      const subject = courseSection.gradeLevelSubject.subject;

      gridRows.push(
        this.toStudentScoresGridRow(
          {
            courseSectionId: courseSection.id,
            subjectCode: subject.code,
            subjectName: subject.name,
            teacherFullName:
              courseSection.teachingAssignments[0]?.teacher.fullName ?? null,
          },
          columns,
          gradebookRow,
        ),
      );
    }

    return {
      semesterId: semester.id,
      semesterName: semester.name,
      academicYearId: semester.academicYearId,
      academicYearName: semester.academicYear.name,
      homeroomClassCode: enrollment.homeroomClass?.code ?? null,
      columns: this.buildStudentScoresGridColumns(),
      rows: gridRows,
    };
  }

  async getMyChildScores(
    user: AuthenticatedUser,
    studentId: string,
    query: PortalMyScoresQuery,
  ): Promise<{ items: PortalMyScoreItem[]; meta: PaginationMeta }> {
    const student = await this.findStudentForParent(
      user.activeSchoolId,
      user.id,
      studentId,
    );

    return this.listScoresForStudent(user.activeSchoolId, student.id, query);
  }

  private async listScoresForStudent(
    schoolId: string,
    studentId: string,
    query: PortalMyScoresQuery,
  ): Promise<{ items: PortalMyScoreItem[]; meta: PaginationMeta }> {
    const semesterId = await this.resolveSemesterId(schoolId, query);

    const where: Prisma.ScoreWhereInput = {
      schoolId,
      studentId,
      ...(query.courseSectionId
        ? { assessment: { courseSectionId: query.courseSectionId } }
        : {}),
      ...(query.type ? { assessment: { type: query.type } } : {}),
      ...(query.subjectId
        ? {
            assessment: {
              courseSection: {
                gradeLevelSubject: { subjectId: query.subjectId },
              },
            },
          }
        : {}),
      ...(semesterId
        ? { assessment: { semesterId } }
        : query.academicYearId
          ? {
              assessment: {
                semester: { academicYearId: query.academicYearId },
              },
            }
          : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.score.count({ where }),
      this.prisma.score.findMany({
        where,
        orderBy: [
          { assessment: { assessmentDate: 'desc' } },
          { assessment: { name: 'asc' } },
        ],
        skip: getSkip(query.page, query.limit),
        take: query.limit,
        include: {
          assessment: {
            include: {
              teacher: { select: { fullName: true } },
              courseSection: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  gradeLevelSubject: {
                    select: {
                      subject: {
                        select: { id: true, code: true, name: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      items: rows.map(toPortalMyScoreItem),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  private async resolveSemesterForScoresGrid(
    schoolId: string,
    semesterFilter: string,
    academicYearId?: string,
  ) {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    return this.prisma.semester.findFirst({
      where: uuidPattern.test(semesterFilter)
        ? {
            id: semesterFilter,
            schoolId,
            ...(academicYearId ? { academicYearId } : {}),
          }
        : {
            schoolId,
            code: semesterFilter,
            ...(academicYearId ? { academicYearId } : {}),
          },
      include: {
        academicYear: { select: { id: true, name: true } },
      },
    });
  }

  private async resolveSemesterId(
    schoolId: string,
    query: PortalMyScoresQuery,
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

  private async assertTeacherCanViewAssessment(
    schoolId: string,
    userId: string,
    assessmentId: string,
  ): Promise<void> {
    const teacher = await this.findTeacherProfileByUserId(schoolId, userId);

    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
      select: { courseSectionId: true, teacherId: true },
    });

    if (!assessment) {
      throw new AppException(
        'ASSESSMENT_NOT_FOUND',
        'Không tìm thấy đầu điểm',
        HttpStatus.NOT_FOUND,
      );
    }

    if (assessment.teacherId === teacher.id) {
      return;
    }

    await this.assertTeacherAssignedToCourseSection(
      schoolId,
      teacher.id,
      assessment.courseSectionId,
    );
  }

  private async assertTeacherAssignedToCourseSection(
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
      select: { id: true, courseSection: { select: { name: true } } },
    });

    if (!assignment) {
      throw new AppException(
        'TEACHER_NOT_ASSIGNED',
        'Giáo viên chưa được phân công lớp môn này',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async assertGradebookSemesterIsCurrent(
    schoolId: string,
    courseSectionId: string,
  ): Promise<void> {
    const courseSection = await this.prisma.courseSection.findFirst({
      where: { id: courseSectionId, schoolId },
      select: {
        semester: { select: { isCurrent: true, name: true } },
      },
    });

    if (!courseSection) {
      throw new AppException(
        'COURSE_SECTION_NOT_FOUND',
        'Không tìm thấy lớp môn học',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!courseSection.semester.isCurrent) {
      throw new AppException(
        'GRADEBOOK_SEMESTER_NOT_CURRENT',
        `Chỉ được sửa sổ điểm ở học kỳ hiện hành (${courseSection.semester.name} không phải HK hiện tại)`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async findTeacherProfileByUserId(schoolId: string, userId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        schoolId,
        userId,
        status: AcademicEntityStatus.ACTIVE,
      },
    });

    if (!teacher) {
      throw new AppException(
        'TEACHER_NOT_FOUND',
        'Không tìm thấy hồ sơ giáo viên',
        HttpStatus.NOT_FOUND,
      );
    }

    return teacher;
  }

  private async findStudentForParent(
    schoolId: string,
    userId: string,
    studentId: string,
  ) {
    const parent = await this.parentsService.findParentByUserId(
      schoolId,
      userId,
    );

    const link = await this.prisma.studentParent.findFirst({
      where: {
        schoolId,
        parentId: parent.id,
        studentId,
      },
    });

    if (!link) {
      throw new AppException(
        'FORBIDDEN_SCOPE',
        'Bạn không có quyền xem điểm của học sinh này',
        HttpStatus.FORBIDDEN,
      );
    }

    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
        status: AcademicEntityStatus.ACTIVE,
      },
    });

    if (!student) {
      throw new AppException(
        'STUDENT_NOT_FOUND',
        'Không tìm thấy học sinh',
        HttpStatus.NOT_FOUND,
      );
    }

    return student;
  }

  private async findStudentProfileByUserId(schoolId: string, userId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        schoolId,
        userId,
        status: AcademicEntityStatus.ACTIVE,
      },
    });

    if (!student) {
      throw new AppException(
        'STUDENT_NOT_FOUND',
        'Không tìm thấy hồ sơ học sinh',
        HttpStatus.NOT_FOUND,
      );
    }

    return student;
  }

  private buildStudentScoresGridColumns(): PortalStudentScoresGridColumn[] {
    const columns: PortalStudentScoresGridColumn[] = [];

    for (let index = 1; index <= STUDENT_SCORES_TX_COLUMN_COUNT; index += 1) {
      columns.push({
        slotKey: `TX${index}`,
        label: `TX ${index}`,
        type: AssessmentType.REGULAR,
      });
    }

    columns.push(
      {
        slotKey: 'GK',
        label: 'Giữa kỳ',
        type: AssessmentType.MIDTERM,
      },
      {
        slotKey: 'CK',
        label: 'Cuối kỳ',
        type: AssessmentType.FINAL,
      },
    );

    return columns;
  }

  private toStudentScoresGridRow(
    meta: {
      courseSectionId: string;
      subjectCode: string | null;
      subjectName: string | null;
      teacherFullName: string | null;
    },
    sourceColumns: PortalGradebookGridColumn[],
    gradebookRow: PortalGradebookGridRow,
  ): PortalStudentScoresGridRow {
    const cells: PortalStudentScoresGridRow['cells'] = {};

    for (let index = 1; index <= STUDENT_SCORES_TX_COLUMN_COUNT; index += 1) {
      const slotKey = `TX${index}`;
      const sourceColumn = sourceColumns.find(
        (column) => column.slotKey === slotKey,
      );
      const sourceCell = sourceColumn
        ? gradebookRow.cells[sourceColumn.slotKey]
        : undefined;

      cells[slotKey] = sourceCell
        ? {
            score: sourceCell.score,
            note: sourceCell.note,
            absent: sourceCell.absent,
          }
        : undefined;
    }

    for (const slotKey of ['GK', 'CK'] as const) {
      const sourceColumn = sourceColumns.find(
        (column) => column.slotKey === slotKey,
      );
      const sourceCell = sourceColumn
        ? gradebookRow.cells[sourceColumn.slotKey]
        : undefined;

      cells[slotKey] = sourceCell
        ? {
            score: sourceCell.score,
            note: sourceCell.note,
            absent: sourceCell.absent,
          }
        : undefined;
    }

    return {
      courseSectionId: meta.courseSectionId,
      subjectCode: meta.subjectCode,
      subjectName: meta.subjectName,
      teacherFullName: meta.teacherFullName,
      cells,
      semesterAverage: gradebookRow.semesterAverage,
    };
  }
}
