import { HttpStatus, Injectable } from '@nestjs/common';
import { SummaryStatus } from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import {
  subjectResultListInclude,
  toSemesterSummaryListItem,
  toSubjectResultListItem,
  toYearSummaryListItem,
} from '@/modules/grade-summaries/mappers/grade-summary.mapper';
import type {
  PortalHomeroomSummariesQuery,
  PortalSummariesQuery,
} from '@/modules/grade-summaries/schemas/grade-summaries-list.schema';
import { ParentsService } from '@/modules/parents/parents.service';
import { SemestersService } from '@/modules/semesters/semesters.service';

@Injectable()
export class PortalSummariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parentsService: ParentsService,
    private readonly semestersService: SemestersService,
  ) {}

  async getMySummaries(user: AuthenticatedUser, query: PortalSummariesQuery) {
    const student = await this.findStudentProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    return this.buildStudentSummaries(user.activeSchoolId, student.id, query, {
      requireClosed: true,
    });
  }

  async getMyChildSummaries(
    user: AuthenticatedUser,
    studentId: string,
    query: PortalSummariesQuery,
  ) {
    await this.assertParentLinkedToStudent(
      user.activeSchoolId,
      user.id,
      studentId,
    );

    return this.buildStudentSummaries(user.activeSchoolId, studentId, query, {
      requireClosed: true,
    });
  }

  async getMyHomeroomSummaries(
    user: AuthenticatedUser,
    query: PortalHomeroomSummariesQuery,
  ) {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    const homeroomClass = await this.prisma.homeroomClass.findFirst({
      where: {
        id: query.homeroomClassId,
        schoolId: user.activeSchoolId,
        homeroomTeacherId: teacher.id,
      },
      select: { id: true, code: true, name: true },
    });

    if (!homeroomClass) {
      throw new AppException(
        'FORBIDDEN_SCOPE',
        'Bạn không có quyền xem lớp chủ nhiệm này',
        HttpStatus.FORBIDDEN,
      );
    }

    const rows = await this.prisma.studentSemesterSummary.findMany({
      where: {
        schoolId: user.activeSchoolId,
        semesterId: query.semesterId,
        homeroomClassId: query.homeroomClassId,
      },
      include: {
        student: { select: { id: true, fullName: true } },
        semester: { select: { id: true, name: true, code: true } },
        homeroomClass: { select: { id: true, code: true, name: true } },
      },
      orderBy: { student: { fullName: 'asc' } },
    });

    return {
      homeroomClass,
      semesterId: query.semesterId,
      rows: rows.map(toSemesterSummaryListItem),
    };
  }

  async getMyHomeroomYearSummaries(
    user: AuthenticatedUser,
    academicYearId: string,
    homeroomClassId: string,
  ) {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    const homeroomClass = await this.prisma.homeroomClass.findFirst({
      where: {
        id: homeroomClassId,
        schoolId: user.activeSchoolId,
        homeroomTeacherId: teacher.id,
      },
      select: { id: true, code: true, name: true },
    });

    if (!homeroomClass) {
      throw new AppException(
        'FORBIDDEN_SCOPE',
        'Bạn không có quyền xem lớp chủ nhiệm này',
        HttpStatus.FORBIDDEN,
      );
    }

    const rows = await this.prisma.studentYearSummary.findMany({
      where: {
        schoolId: user.activeSchoolId,
        academicYearId,
        homeroomClassId,
      },
      include: {
        student: { select: { id: true, fullName: true } },
        academicYear: { select: { id: true, name: true, code: true } },
        homeroomClass: {
          select: {
            id: true,
            code: true,
            name: true,
            gradeLevel: { select: { code: true } },
          },
        },
        nextHomeroomClass: { select: { id: true, code: true, name: true } },
      },
      orderBy: { student: { fullName: 'asc' } },
    });

    return {
      homeroomClass,
      academicYearId,
      rows: rows.map(toYearSummaryListItem),
    };
  }

  private async buildStudentSummaries(
    schoolId: string,
    studentId: string,
    query: PortalSummariesQuery,
    options: { requireClosed: boolean },
  ) {
    const semester = await this.resolveSemester(schoolId, query);

    const semesterSummary = semester
      ? await this.prisma.studentSemesterSummary.findFirst({
          where: {
            schoolId,
            studentId,
            semesterId: semester.id,
            ...(options.requireClosed ? { status: SummaryStatus.CLOSED } : {}),
          },
          include: {
            student: { select: { id: true, fullName: true } },
            semester: { select: { id: true, name: true, code: true } },
            homeroomClass: { select: { id: true, code: true, name: true } },
          },
        })
      : null;

    const subjectResults = semester
      ? await this.prisma.studentSubjectResult.findMany({
          where: {
            schoolId,
            studentId,
            semesterId: semester.id,
            ...(options.requireClosed ? { status: SummaryStatus.CLOSED } : {}),
          },
          include: subjectResultListInclude,
          orderBy: { courseSection: { code: 'asc' } },
        })
      : [];

    const academicYearId =
      query.academicYearId ?? semester?.academicYearId ?? null;

    const yearSummary = academicYearId
      ? await this.prisma.studentYearSummary.findFirst({
          where: {
            schoolId,
            studentId,
            academicYearId,
            ...(options.requireClosed ? { status: SummaryStatus.CLOSED } : {}),
          },
          include: {
            student: { select: { id: true, fullName: true } },
            academicYear: { select: { id: true, name: true, code: true } },
            homeroomClass: {
              select: {
                id: true,
                code: true,
                name: true,
                gradeLevel: { select: { code: true } },
              },
            },
            nextHomeroomClass: { select: { id: true, code: true, name: true } },
          },
        })
      : null;

    const conductRecord = semester
      ? await this.prisma.studentConductRecord.findFirst({
          where: {
            schoolId,
            studentId,
            semesterId: semester.id,
            ...(options.requireClosed ? { status: SummaryStatus.CLOSED } : {}),
          },
        })
      : null;

    return {
      semesterId: semester?.id ?? null,
      semesterName: semester?.name ?? null,
      semesterSummary: semesterSummary
        ? toSemesterSummaryListItem(semesterSummary)
        : null,
      subjectResults: subjectResults.map(toSubjectResultListItem),
      conductRecord: conductRecord
        ? {
            trainingResultLevel: conductRecord.trainingResultLevel,
            note: conductRecord.note,
            status: conductRecord.status,
          }
        : null,
      yearSummary: yearSummary ? toYearSummaryListItem(yearSummary) : null,
    };
  }

  private async resolveSemester(schoolId: string, query: PortalSummariesQuery) {
    if (query.semesterId) {
      const semester = await this.prisma.semester.findFirst({
        where: { id: query.semesterId, schoolId },
        select: {
          id: true,
          name: true,
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

      return semester;
    }

    if (query.academicYearId) {
      const semester = await this.semestersService.findCurrentForYear(
        schoolId,
        query.academicYearId,
      );

      return {
        id: semester.id,
        name: semester.name,
        academicYearId: semester.academicYearId,
      };
    }

    const semester = await this.semestersService.findCurrentForSchool(schoolId);

    return {
      id: semester.id,
      name: semester.name,
      academicYearId: semester.academicYearId,
    };
  }

  private async assertParentLinkedToStudent(
    schoolId: string,
    userId: string,
    studentId: string,
  ): Promise<void> {
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
        'Bạn không có quyền xem kết quả của học sinh này',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async findStudentProfileByUserId(schoolId: string, userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { schoolId, userId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!student) {
      throw new AppException(
        'STUDENT_PROFILE_NOT_FOUND',
        'Không tìm thấy hồ sơ học sinh',
        HttpStatus.NOT_FOUND,
      );
    }

    return student;
  }

  private async findTeacherProfileByUserId(schoolId: string, userId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { schoolId, userId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!teacher) {
      throw new AppException(
        'TEACHER_PROFILE_NOT_FOUND',
        'Không tìm thấy hồ sơ giáo viên',
        HttpStatus.NOT_FOUND,
      );
    }

    return teacher;
  }
}
