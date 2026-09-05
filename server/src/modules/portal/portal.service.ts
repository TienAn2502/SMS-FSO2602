import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcademicEntityStatus,
  EnrollmentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { toHomeroomClassResponse } from '@/modules/homeroom-classes/mappers/homeroom-class.mapper';
import { toLinkedStudentSummary } from '@/modules/parents/mappers/parent.mapper';
import { ParentsService } from '@/modules/parents/parents.service';
import { SemestersService } from '@/modules/semesters/semesters.service';
import {
  studentEnrollmentInclude,
  toStudentEnrollmentResponse,
} from '@/modules/student-enrollments/mappers/student-enrollment.mapper';
import {
  pickCurrentEnrollment,
  studentInclude,
  toStudentResponse,
} from '@/modules/students/mappers/student.mapper';
import { toTeachingAssignmentResponse } from '@/modules/teaching-assignments/mappers/teaching-assignment.mapper';
import { toTimetableEntryResponse } from '@/modules/timetable-entries/mappers/timetable-entry.mapper';
import { isSemesterUuid } from '@/modules/course-sections/schemas/course-section.schema';
import type {
  ListMyCourseSectionsQuery,
  PortalExportTimetableQuery,
  PortalTimetableQuery,
} from '@/modules/portal/schemas/portal.schema';
import { CourseSectionsService } from '@/modules/course-sections/course-sections.service';
import {
  TimetableExportService,
  type TimetableExportFile,
} from '@/modules/exports/timetable-export.service';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parentsService: ParentsService,
    private readonly semestersService: SemestersService,
    private readonly courseSectionsService: CourseSectionsService,
    private readonly timetableExportService: TimetableExportService,
  ) {}

  async getMe(user: AuthenticatedUser) {
    const base = {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      activeSchoolId: user.activeSchoolId,
    };

    switch (user.role) {
      case UserRole.TEACHER: {
        const teacher = await this.findTeacherProfileByUserId(
          user.activeSchoolId,
          user.id,
        );
        return {
          ...base,
          teacher: {
            id: teacher.id,
            fullName: teacher.fullName,
            specialization: teacher.specialization,
            phone: teacher.phone,
            status: teacher.status,
          },
        };
      }
      case UserRole.STUDENT: {
        const student = await this.findStudentProfileByUserId(
          user.activeSchoolId,
          user.id,
        );
        return {
          ...base,
          student: toStudentResponse(student),
        };
      }
      case UserRole.PARENT: {
        const parent = await this.parentsService.findParentByUserId(
          user.activeSchoolId,
          user.id,
        );
        return {
          ...base,
          parent: {
            id: parent.id,
            fullName: parent.fullName,
            phone: parent.phone,
            status: parent.status,
            linkedStudents: parent.studentParents.map(toLinkedStudentSummary),
          },
        };
      }
      default:
        return base;
    }
  }

  async getMyHomeroomClasses(user: AuthenticatedUser) {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    const classes = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId: user.activeSchoolId,
        homeroomTeacherId: teacher.id,
        status: AcademicEntityStatus.ACTIVE,
      },
      orderBy: { code: 'asc' },
    });

    return classes.map(toHomeroomClassResponse);
  }

  async getMyHomeroomClassStudents(
    user: AuthenticatedUser,
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
        status: AcademicEntityStatus.ACTIVE,
      },
    });

    if (!homeroomClass) {
      throw new AppException(
        'FORBIDDEN_SCOPE',
        'Bạn không có quyền xem học sinh lớp này',
        HttpStatus.FORBIDDEN,
      );
    }

    const currentSemester = await this.semestersService.findCurrentForSchool(
      user.activeSchoolId,
    );

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId: user.activeSchoolId,
        homeroomClassId,
        semesterId: currentSemester.id,
        status: EnrollmentStatus.ACTIVE,
      },
      include: studentEnrollmentInclude,
      orderBy: { student: { fullName: 'asc' } },
    });

    return enrollments.map(toStudentEnrollmentResponse);
  }

  async getMyTeachingAssignments(user: AuthenticatedUser) {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    const currentSemester = await this.semestersService.findCurrentForSchool(
      user.activeSchoolId,
    );

    const assignments = await this.prisma.teachingAssignment.findMany({
      where: {
        schoolId: user.activeSchoolId,
        teacherId: teacher.id,
        status: AcademicEntityStatus.ACTIVE,
        courseSection: {
          semesterId: currentSemester.id,
        },
      },
      include: {
        teacher: { select: { id: true, fullName: true } },
        courseSection: {
          select: {
            id: true,
            code: true,
            name: true,
            semesterId: true,
            semester: { select: { academicYearId: true } },
          },
        },
      },
      orderBy: { assignAt: 'desc' },
    });

    return assignments.map(toTeachingAssignmentResponse);
  }

  async getMyTimetable(user: AuthenticatedUser, query: PortalTimetableQuery) {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    const where = await this.buildPortalTimetableWhere(
      user.activeSchoolId,
      query,
    );

    const entries = await this.prisma.timetableEntry.findMany({
      where: {
        ...where,
        teacherId: teacher.id,
      },
      include: {
        courseSection: {
          select: { id: true, code: true, name: true, homeroomClassId: true },
        },
        teacher: { select: { id: true, fullName: true } },
        semester: { select: { id: true, academicYearId: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });

    return entries.map(toTimetableEntryResponse);
  }

  async getMyStudentProfile(user: AuthenticatedUser) {
    const student = await this.findStudentProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    return toStudentResponse(student);
  }

  async getMyClassTimetable(
    user: AuthenticatedUser,
    query: PortalTimetableQuery,
  ) {
    const student = await this.findStudentProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    const enrollment = this.resolveEnrollmentForTimetable(
      student.enrollments,
      query,
    );
    if (!enrollment) {
      return {
        homeroomClass: null,
        semester: null,
        entries: [],
      };
    }

    const where = await this.buildPortalTimetableWhere(
      user.activeSchoolId,
      query,
      enrollment.homeroomClassId,
    );

    const entries = await this.prisma.timetableEntry.findMany({
      where,
      include: {
        courseSection: {
          select: { id: true, code: true, name: true, homeroomClassId: true },
        },
        teacher: { select: { id: true, fullName: true } },
        semester: { select: { id: true, academicYearId: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });

    return {
      homeroomClass: {
        id: enrollment.homeroomClass.id,
        code: enrollment.homeroomClass.code,
        name: enrollment.homeroomClass.name,
      },
      semester: {
        id: enrollment.semester.id,
        code: enrollment.semester.code,
        name: enrollment.semester.name,
      },
      entries: entries.map(toTimetableEntryResponse),
    };
  }

  async exportMyTimetable(
    user: AuthenticatedUser,
    query: PortalExportTimetableQuery,
  ): Promise<TimetableExportFile> {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    const entries = await this.getMyTimetable(user, query);
    const semester = await this.resolvePortalExportSemesterLabel(
      user.activeSchoolId,
      query,
    );

    return this.timetableExportService.exportTimetableEntries(
      entries,
      {
        title: 'THỜI KHÓA BIỂU GIÁO VIÊN',
        lines: [
          { label: 'Giáo viên', value: teacher.fullName },
          { label: 'Năm học', value: semester.academicYearName },
          { label: 'Học kỳ', value: semester.semesterName },
          { label: 'Số tiết', value: String(entries.length) },
        ],
      },
      query.format,
    );
  }

  async exportMyClassTimetable(
    user: AuthenticatedUser,
    query: PortalExportTimetableQuery,
  ): Promise<TimetableExportFile> {
    const timetable = await this.getMyClassTimetable(user, query);

    if (!timetable.homeroomClass) {
      throw new AppException(
        'ENROLLMENT_NOT_FOUND',
        'Không tìm thấy ghi danh để export thời khóa biểu',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const academicYearName = timetable.semester
      ? await this.resolveAcademicYearName(
          user.activeSchoolId,
          query.academicYearId,
          timetable.semester.id,
        )
      : '—';

    return this.timetableExportService.exportTimetableEntries(
      timetable.entries,
      {
        title: 'THỜI KHÓA BIỂU LỚP HÀNH CHÍNH',
        lines: [
          {
            label: 'Lớp HC',
            value:
              timetable.homeroomClass.name.trim() ===
              timetable.homeroomClass.code.trim()
                ? timetable.homeroomClass.code
                : `${timetable.homeroomClass.code} — ${timetable.homeroomClass.name}`,
          },
          { label: 'Năm học', value: academicYearName },
          {
            label: 'Học kỳ',
            value: timetable.semester?.name ?? '—',
          },
          { label: 'Số tiết', value: String(timetable.entries.length) },
        ],
      },
      query.format,
    );
  }

  async getMyChildren(user: AuthenticatedUser) {
    const parent = await this.parentsService.findParentByUserId(
      user.activeSchoolId,
      user.id,
    );

    const links = await this.prisma.studentParent.findMany({
      where: {
        schoolId: user.activeSchoolId,
        parentId: parent.id,
      },
      include: {
        student: {
          include: studentInclude,
        },
      },
      orderBy: { student: { fullName: 'asc' } },
    });

    return links.map((link) => ({
      linkId: link.id,
      relationship: link.relationship,
      isPrimaryContact: link.isPrimaryContact,
      student: toStudentResponse(link.student),
    }));
  }

  async getMyCourseSections(
    user: AuthenticatedUser,
    query: ListMyCourseSectionsQuery,
  ) {
    const student = await this.findStudentProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    const enrollmentScopes = student.enrollments
      .filter((enrollment) => enrollment.homeroomClassId)
      .map((enrollment) => ({
        homeroomClassId: enrollment.homeroomClassId!,
        semesterId: enrollment.semesterId,
      }));

    return this.courseSectionsService.listForStudentEnrollments(
      user.activeSchoolId,
      enrollmentScopes,
      query,
    );
  }

  async resolveTeacherId(user: AuthenticatedUser): Promise<string> {
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    return teacher.id;
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

  private async findStudentProfileByUserId(schoolId: string, userId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        schoolId,
        userId,
        status: AcademicEntityStatus.ACTIVE,
      },
      include: studentInclude, // Lấy kèm thêm các thông tin có liên quan
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

  private async buildPortalTimetableWhere(
    schoolId: string,
    query: PortalTimetableQuery,
    homeroomClassId?: string,
  ): Promise<Prisma.TimetableEntryWhereInput> {
    const semesterFilter = await this.resolvePortalTimetableSemesterFilter(
      schoolId,
      query,
    );
    const courseSectionFilter = this.buildPortalTimetableCourseSectionFilter(
      query,
      homeroomClassId,
    );

    return {
      schoolId,
      ...(query.status ? { status: query.status } : {}),
      ...semesterFilter,
      ...(Object.keys(courseSectionFilter).length > 0
        ? { courseSection: courseSectionFilter }
        : {}),
    };
  }

  private buildPortalTimetableCourseSectionFilter(
    query: PortalTimetableQuery,
    homeroomClassId?: string,
  ): Prisma.CourseSectionWhereInput {
    return {
      ...(homeroomClassId ? { homeroomClassId } : {}),
      ...(query.subjectId
        ? {
            gradeLevelSubject: {
              subjectId: query.subjectId,
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
    };
  }

  private async resolvePortalTimetableSemesterFilter(
    schoolId: string,
    query: PortalTimetableQuery,
  ): Promise<Prisma.TimetableEntryWhereInput> {
    if (query.semesterId) {
      if (isSemesterUuid(query.semesterId)) {
        return { semesterId: query.semesterId };
      }

      return {
        semester: {
          schoolId,
          code: query.semesterId,
          ...(query.academicYearId
            ? { academicYearId: query.academicYearId }
            : {}),
        },
      };
    }

    if (query.academicYearId) {
      return {
        semester: {
          academicYearId: query.academicYearId,
        },
      };
    }

    const currentSemester =
      await this.semestersService.findCurrentForSchool(schoolId);

    return { semesterId: currentSemester.id };
  }

  private resolveEnrollmentForTimetable(
    enrollments: Parameters<typeof pickCurrentEnrollment>[0],
    query: PortalTimetableQuery,
  ) {
    const activeEnrollments = enrollments.filter(
      (enrollment) => enrollment.status === EnrollmentStatus.ACTIVE,
    );

    if (activeEnrollments.length === 0) {
      return null;
    }

    if (query.semesterId) {
      if (isSemesterUuid(query.semesterId)) {
        return (
          activeEnrollments.find(
            (enrollment) => enrollment.semesterId === query.semesterId,
          ) ?? null
        );
      }

      return (
        activeEnrollments.find(
          (enrollment) =>
            enrollment.semester.code === query.semesterId &&
            (!query.academicYearId ||
              enrollment.semester.academicYear.id === query.academicYearId),
        ) ?? null
      );
    }

    if (query.academicYearId) {
      return (
        activeEnrollments.find(
          (enrollment) =>
            enrollment.semester.academicYear.id === query.academicYearId,
        ) ?? pickCurrentEnrollment(enrollments)
      );
    }

    return pickCurrentEnrollment(enrollments);
  }

  private async resolvePortalExportSemesterLabel(
    schoolId: string,
    query: PortalTimetableQuery,
  ): Promise<{ semesterName: string; academicYearName: string }> {
    if (query.semesterId) {
      if (isSemesterUuid(query.semesterId)) {
        const semester = await this.prisma.semester.findFirst({
          where: { id: query.semesterId, schoolId },
          select: {
            name: true,
            academicYear: { select: { name: true } },
          },
        });

        return {
          semesterName: semester?.name ?? '—',
          academicYearName: semester?.academicYear.name ?? '—',
        };
      }

      const semester = await this.prisma.semester.findFirst({
        where: {
          schoolId,
          code: query.semesterId,
          ...(query.academicYearId
            ? { academicYearId: query.academicYearId }
            : {}),
        },
        select: {
          name: true,
          academicYear: { select: { name: true } },
        },
      });

      return {
        semesterName: semester?.name ?? query.semesterId,
        academicYearName: semester?.academicYear.name ?? '—',
      };
    }

    if (query.academicYearId) {
      const academicYear = await this.prisma.academicYear.findFirst({
        where: { id: query.academicYearId, schoolId },
        select: { name: true },
      });

      return {
        semesterName: 'Tất cả học kỳ',
        academicYearName: academicYear?.name ?? '—',
      };
    }

    const currentSemester =
      await this.semestersService.findCurrentForSchool(schoolId);
    const semester = await this.prisma.semester.findFirst({
      where: { id: currentSemester.id, schoolId },
      select: {
        name: true,
        academicYear: { select: { name: true } },
      },
    });

    return {
      semesterName: semester?.name ?? '—',
      academicYearName: semester?.academicYear.name ?? '—',
    };
  }

  private async resolveAcademicYearName(
    schoolId: string,
    academicYearId: string | undefined,
    semesterId: string,
  ): Promise<string> {
    if (academicYearId) {
      const academicYear = await this.prisma.academicYear.findFirst({
        where: { id: academicYearId, schoolId },
        select: { name: true },
      });

      if (academicYear) {
        return academicYear.name;
      }
    }

    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, schoolId },
      select: { academicYear: { select: { name: true } } },
    });

    return semester?.academicYear.name ?? '—';
  }
}
