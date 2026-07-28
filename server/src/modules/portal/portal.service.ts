/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcademicEntityStatus,
  EnrollmentStatus,
  UserRole,
} from '@prisma/client';

import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../common/database/prisma.service';
import { toHomeroomClassResponse } from '../homeroom-classes/mappers/homeroom-class.mapper';
import { toLinkedStudentSummary } from '../parents/mappers/parent.mapper';
import { ParentsService } from '../parents/parents.service';
import { SemestersService } from '../semesters/semesters.service';
import {
  studentEnrollmentInclude,
  toStudentEnrollmentResponse,
} from '../student-enrollments/mappers/student-enrollment.mapper';
import {
  pickCurrentEnrollment,
  studentInclude,
  toStudentResponse,
} from '../students/mappers/student.mapper';
import { toTeachingAssignmentResponse } from '../teaching-assignments/mappers/teaching-assignment.mapper';
import { toTimetableEntryResponse } from '../timetable-entries/mappers/timetable-entry.mapper';
import type { PortalTimetableQuery } from './schemas/portal.schema';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parentsService: ParentsService,
    private readonly semestersService: SemestersService,
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
    this.assertRole(user, UserRole.TEACHER);

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
    this.assertRole(user, UserRole.TEACHER);

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
    this.assertRole(user, UserRole.TEACHER);

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
    this.assertRole(user, UserRole.TEACHER);

    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    const semesterId = query.includeAllSemesters
      ? query.semesterId
      : (query.semesterId ??
        (await this.semestersService.findCurrentForSchool(user.activeSchoolId))
          .id);

    const entries = await this.prisma.timetableEntry.findMany({
      where: {
        schoolId: user.activeSchoolId,
        teacherId: teacher.id,
        status: AcademicEntityStatus.ACTIVE,
        ...(semesterId ? { semesterId } : {}),
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
    this.assertRole(user, UserRole.STUDENT);

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
    this.assertRole(user, UserRole.STUDENT);

    const student = await this.findStudentProfileByUserId(
      user.activeSchoolId,
      user.id,
    );
    // console.dir(student);

    const enrollment = pickCurrentEnrollment(student.enrollments);
    if (!enrollment) {
      return {
        homeroomClass: null,
        semester: null,
        entries: [],
      };
    }

    // TODO: Tính toán semesterId dựa trên query.includeAllSemesters
    const semesterId = query.includeAllSemesters
      ? (query.semesterId ?? enrollment.semesterId)
      : (query.semesterId ??
        (enrollment.semester.isCurrent
          ? enrollment.semesterId
          : (
              await this.semestersService.findCurrentForSchool(
                user.activeSchoolId,
              )
            ).id));

    const entries = await this.prisma.timetableEntry.findMany({
      where: {
        schoolId: user.activeSchoolId,
        semesterId,
        status: AcademicEntityStatus.ACTIVE,
        courseSection: {
          homeroomClassId: enrollment.homeroomClassId, // tìm theo lớp
        },
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

  async getMyChildren(user: AuthenticatedUser) {
    this.assertRole(user, UserRole.PARENT);

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

  private assertRole(user: AuthenticatedUser, role: UserRole): void {
    if (user.role !== role) {
      throw new AppException(
        'FORBIDDEN',
        'Bạn không có quyền truy cập tài nguyên này',
        HttpStatus.FORBIDDEN,
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

  private async findStudentProfileByUserId(schoolId: string, userId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        schoolId,
        userId,
        status: AcademicEntityStatus.ACTIVE,
      },
      include: studentInclude,
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
}
