import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcademicEntityStatus,
  AttendanceSessionStatus,
  UserRole,
} from '@prisma/client';

import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { PrismaService } from '../../common/database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import type { PaginationMeta } from '../../common/types/api-response.types';
import {
  buildPaginationMeta,
  getSkip,
} from '../../common/utils/pagination.util';
import { AttendanceRecordsService } from '../attendance-records/attendance-records.service';
import type { AttendanceSessionDetailResponse } from '../attendance-sessions/mappers/attendance-session.mapper';
import type { AttendanceSessionResponse } from '../attendance-sessions/mappers/attendance-session.mapper';
import { AttendanceSessionsService } from '../attendance-sessions/attendance-sessions.service';
import { ParentsService } from '../parents/parents.service';
import { SemestersService } from '../semesters/semesters.service';
import {
  toPortalAttendanceClassItem,
  toPortalMyAttendanceItem,
  type PortalAttendanceClassItem,
  type PortalMyAttendanceItem,
} from './mappers/portal-attendance.mapper';
import type {
  PortalBulkUpsertAttendanceRecordsInput,
  PortalCloseAttendanceSessionInput,
  PortalCreateAttendanceSessionInput,
  PortalMyAttendanceQuery,
} from './schemas/portal-attendance.schema';

@Injectable()
export class PortalAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parentsService: ParentsService,
    private readonly semestersService: SemestersService,
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly attendanceRecordsService: AttendanceRecordsService,
  ) {}

  async getMyAttendanceClasses(
    user: AuthenticatedUser,
  ): Promise<PortalAttendanceClassItem[]> {
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
          status: AcademicEntityStatus.ACTIVE,
        },
      },
      include: {
        courseSection: {
          select: {
            id: true,
            code: true,
            name: true,
            semesterId: true,
            homeroomClass: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
      orderBy: { courseSection: { code: 'asc' } },
    });

    return assignments.map(toPortalAttendanceClassItem);
  }

  async getMyAttendanceSession(
    user: AuthenticatedUser,
    sessionId: string,
  ): Promise<AttendanceSessionDetailResponse> {
    this.assertRole(user, UserRole.TEACHER);
    await this.assertTeacherOwnsSession(
      user.activeSchoolId,
      user.id,
      sessionId,
    );

    return this.attendanceSessionsService.findById(
      user.activeSchoolId,
      sessionId,
    );
  }

  async createMyAttendanceSession(
    user: AuthenticatedUser,
    input: PortalCreateAttendanceSessionInput,
  ): Promise<AttendanceSessionResponse> {
    this.assertRole(user, UserRole.TEACHER);
    const teacher = await this.findTeacherProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    return this.attendanceSessionsService.create(user.activeSchoolId, {
      ...input,
      teacherId: teacher.id,
    });
  }

  async bulkUpsertMySessionRecords(
    user: AuthenticatedUser,
    sessionId: string,
    input: PortalBulkUpsertAttendanceRecordsInput,
  ): Promise<AttendanceSessionDetailResponse> {
    this.assertRole(user, UserRole.TEACHER);
    await this.assertTeacherOwnsOpenSession(
      user.activeSchoolId,
      user.id,
      sessionId,
    );

    return this.attendanceRecordsService.bulkUpsert(
      user.activeSchoolId,
      sessionId,
      input,
    );
  }

  async closeMyAttendanceSession(
    user: AuthenticatedUser,
    sessionId: string,
    input: PortalCloseAttendanceSessionInput,
  ): Promise<AttendanceSessionResponse> {
    this.assertRole(user, UserRole.TEACHER);
    await this.assertTeacherOwnsOpenSession(
      user.activeSchoolId,
      user.id,
      sessionId,
    );

    return this.attendanceSessionsService.update(
      user.activeSchoolId,
      sessionId,
      input,
    );
  }

  async getMyAttendance(
    user: AuthenticatedUser,
    query: PortalMyAttendanceQuery,
  ): Promise<{ items: PortalMyAttendanceItem[]; meta: PaginationMeta }> {
    this.assertRole(user, UserRole.STUDENT);
    const student = await this.findStudentProfileByUserId(
      user.activeSchoolId,
      user.id,
    );

    return this.listAttendanceForStudent(
      user.activeSchoolId,
      student.id,
      query,
    );
  }

  async getMyChildAttendance(
    user: AuthenticatedUser,
    studentId: string,
    query: PortalMyAttendanceQuery,
  ): Promise<{ items: PortalMyAttendanceItem[]; meta: PaginationMeta }> {
    this.assertRole(user, UserRole.PARENT);
    const parent = await this.parentsService.findParentByUserId(
      user.activeSchoolId,
      user.id,
    );

    const link = await this.prisma.studentParent.findFirst({
      where: {
        schoolId: user.activeSchoolId,
        parentId: parent.id,
        studentId,
      },
    });

    if (!link) {
      throw new AppException(
        'FORBIDDEN_SCOPE',
        'Bạn không có quyền xem điểm danh của học sinh này',
        HttpStatus.FORBIDDEN,
      );
    }

    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: user.activeSchoolId,
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

    return this.listAttendanceForStudent(
      user.activeSchoolId,
      studentId,
      query,
    );
  }

  private async listAttendanceForStudent(
    schoolId: string,
    studentId: string,
    query: PortalMyAttendanceQuery,
  ): Promise<{ items: PortalMyAttendanceItem[]; meta: PaginationMeta }> {
    const semesterId = await this.resolveSemesterId(schoolId, query);

    const where = {
      schoolId,
      studentId,
      ...(semesterId ? { session: { semesterId } } : {}),
    };

    const [total, records] = await this.prisma.$transaction([
      this.prisma.attendanceRecord.count({ where }),
      this.prisma.attendanceRecord.findMany({
        where,
        orderBy: [
          { session: { sessionDate: 'desc' } },
          { session: { periodNumber: 'desc' } },
        ],
        skip: getSkip(query.page, query.limit),
        take: query.limit,
        include: {
          session: {
            include: {
              teacher: { select: { id: true, fullName: true } },
              courseSection: { select: { id: true, code: true, name: true } },
            },
          },
        },
      }),
    ]);

    return {
      items: records.map(toPortalMyAttendanceItem),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  private async resolveSemesterId(
    schoolId: string,
    query: PortalMyAttendanceQuery,
  ): Promise<string | undefined> {
    if (query.includeAllSemesters) {
      return query.semesterId;
    }

    if (query.semesterId) {
      return query.semesterId;
    }

    const currentSemester =
      await this.semestersService.findCurrentForSchool(schoolId);

    return currentSemester.id;
  }

  private async assertTeacherOwnsSession(
    schoolId: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const teacher = await this.findTeacherProfileByUserId(schoolId, userId);

    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        schoolId,
        teacherId: teacher.id,
      },
      select: { id: true },
    });

    if (!session) {
      throw new AppException(
        'FORBIDDEN_SCOPE',
        'Bạn không có quyền xem phiên điểm danh này',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async assertTeacherOwnsOpenSession(
    schoolId: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const teacher = await this.findTeacherProfileByUserId(schoolId, userId);

    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        schoolId,
        teacherId: teacher.id,
      },
      select: { status: true },
    });

    if (!session) {
      throw new AppException(
        'FORBIDDEN_SCOPE',
        'Bạn không có quyền thao tác phiên điểm danh này',
        HttpStatus.FORBIDDEN,
      );
    }

    if (session.status !== AttendanceSessionStatus.OPEN) {
      throw new AppException(
        'ATTENDANCE_SESSION_CLOSED',
        'Phiên điểm danh đã đóng — không thể ghi bản ghi',
        HttpStatus.CONFLICT,
      );
    }
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
