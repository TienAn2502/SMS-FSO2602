import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcademicEntityStatus,
  AttendanceSessionStatus,
  Prisma,
} from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { parseIsoDate } from '@/common/schemas/academic.schema';
import type { PaginationMeta } from '@/common/types/api-response.types';
import {
  buildPaginationMeta,
  getSkip,
} from '@/common/utils/pagination.util';
import { CourseSectionsService } from '@/modules/course-sections/course-sections.service';
import { SemestersService } from '@/modules/semesters/semesters.service';
import { TeachersService } from '@/modules/teachers/teachers.service';
import {
  attendanceSessionDetailInclude,
  attendanceSessionInclude,
  toAttendanceSessionDetailResponse,
  toAttendanceSessionResponse,
  type AttendanceSessionDetailResponse,
  type AttendanceSessionResponse,
} from '@/modules/attendance-sessions/mappers/attendance-session.mapper';
import type {
  CreateAttendanceSessionInput,
  ListAttendanceSessionsQuery,
  UpdateAttendanceSessionInput,
} from '@/modules/attendance-sessions/schemas/attendance-session.schema';

@Injectable()
export class AttendanceSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teachersService: TeachersService,
    private readonly courseSectionsService: CourseSectionsService,
    private readonly semestersService: SemestersService,
  ) {}

  async list(
    schoolId: string,
    query: ListAttendanceSessionsQuery,
  ): Promise<{ items: AttendanceSessionResponse[]; meta: PaginationMeta }> {
    const semesterId = await this.resolveSemesterId(schoolId, query);

    const where: Prisma.AttendanceSessionWhereInput = {
      schoolId,
      ...(semesterId ? { semesterId } : {}),
      ...(query.courseSectionId
        ? { courseSectionId: query.courseSectionId }
        : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.sessionDate
        ? { sessionDate: parseIsoDate(query.sessionDate) }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.homeroomClassId
        ? {
            courseSection: {
              homeroomClassId: query.homeroomClassId,
            },
          }
        : {}),
      ...(query.academicYearId && !semesterId
        ? {
            semester: {
              academicYearId: query.academicYearId,
            },
          }
        : {}),
    };

    // Sắp xếp theo nhiều field
    const orderBy: Prisma.AttendanceSessionOrderByWithRelationInput[] = [
      { [query.sortBy]: query.sortOrder },
      ...(query.sortBy === 'sessionDate'
        ? [{ periodNumber: 'asc' as const }]
        : [{ sessionDate: 'desc' as const }]),
    ];

    const [total, sessions] = await this.prisma.$transaction([
      this.prisma.attendanceSession.count({ where }),
      this.prisma.attendanceSession.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
        include: attendanceSessionInclude,
      }),
    ]);

    return {
      items: sessions.map(toAttendanceSessionResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(
    schoolId: string,
    sessionId: string,
  ): Promise<AttendanceSessionDetailResponse> {
    const session = await this.findSessionInTenant(schoolId, sessionId, true);
    return toAttendanceSessionDetailResponse(session);
  }

  async create(
    schoolId: string,
    input: CreateAttendanceSessionInput,
  ): Promise<AttendanceSessionResponse> {
    // Lấy ra lớp môn học
    const courseSection =
      await this.courseSectionsService.findCourseSectionInTenant(
        schoolId,
        input.courseSectionId,
      );

    if (courseSection.status !== AcademicEntityStatus.ACTIVE) {
      throw new AppException(
        'COURSE_SECTION_NOT_FOUND',
        'Lớp môn học không hoạt động',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this.validateTeacher(schoolId, input.teacherId); // Kiểm tra GV có còn hoạt động không

    // Kiểm tra GV có được phân công lớp môn này không
    await this.assertTeacherAssigned(
      schoolId,
      input.teacherId,
      input.courseSectionId,
    );

    const timetableEntryId = await this.resolveTimetableEntryId(
      schoolId,
      input,
      courseSection.semesterId,
    );

    const sessionDate = parseIsoDate(input.sessionDate);

    const existing = await this.prisma.attendanceSession.findUnique({
      where: {
        courseSectionId_sessionDate_periodNumber: {
          courseSectionId: input.courseSectionId,
          sessionDate,
          periodNumber: input.periodNumber,
        },
      },
    });

    if (existing) {
      throw new AppException(
        'ATTENDANCE_SESSION_CONFLICT',
        'Đã có phiên điểm danh cho lớp môn vào ngày và tiết này',
        HttpStatus.CONFLICT,
      );
    }

    try {
      const session = await this.prisma.attendanceSession.create({
        data: {
          schoolId,
          semesterId: courseSection.semesterId,
          courseSectionId: input.courseSectionId,
          teacherId: input.teacherId,
          timetableEntryId,
          sessionDate,
          periodNumber: input.periodNumber,
          note: input.note ?? null,
          status: AttendanceSessionStatus.OPEN,
        },
        include: attendanceSessionInclude,
      });

      return toAttendanceSessionResponse(session);
    } catch (error: unknown) {
      this.handleSessionConflict(error);
      throw error;
    }
  }

  async update(
    schoolId: string,
    sessionId: string,
    input: UpdateAttendanceSessionInput,
  ): Promise<AttendanceSessionResponse> {
    await this.findSessionInTenant(schoolId, sessionId);

    const updated = await this.prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
      include: attendanceSessionInclude,
    });

    return toAttendanceSessionResponse(updated);
  }

  private async validateTeacher(
    schoolId: string,
    teacherId: string,
  ): Promise<void> {
    const teacher = await this.teachersService.findTeacherInTenant(
      schoolId,
      teacherId,
    );

    if (teacher.status !== AcademicEntityStatus.ACTIVE) {
      throw new AppException(
        'TEACHER_NOT_FOUND',
        'Giáo viên không hoạt động',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async assertTeacherAssigned(
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
    });

    if (!assignment) {
      throw new AppException(
        'TEACHER_NOT_ASSIGNED',
        'Giáo viên chưa được phân công lớp môn này',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async resolveTimetableEntryId(
    schoolId: string,
    input: CreateAttendanceSessionInput,
    semesterId: string,
  ): Promise<string | null> {
    if (!input.timetableEntryId) {
      return null;
    }

    const entry = await this.prisma.timetableEntry.findFirst({
      where: {
        id: input.timetableEntryId,
        schoolId,
        courseSectionId: input.courseSectionId,
        teacherId: input.teacherId,
        semesterId,
        status: AcademicEntityStatus.ACTIVE,
      },
    });

    if (!entry) {
      throw new AppException(
        'TIMETABLE_ENTRY_NOT_FOUND',
        'Tiết TKB không khớp lớp môn hoặc giáo viên',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (entry.periodNumber !== input.periodNumber) {
      throw new AppException(
        'VALIDATION_ERROR',
        'Tiết TKB không khớp periodNumber',
        HttpStatus.BAD_REQUEST,
      );
    }

    return entry.id;
  }

  private async resolveSemesterId(
    schoolId: string,
    query: ListAttendanceSessionsQuery,
  ): Promise<string | undefined> {
    if (query.includeAllSemesters) {
      return query.semesterId;
    }

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

  private async findSessionInTenant(
    schoolId: string,
    sessionId: string,
    withRecords = false,
  ) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: sessionId, schoolId },
      include: withRecords
        ? attendanceSessionDetailInclude
        : attendanceSessionInclude,
    });

    if (!session) {
      throw new AppException(
        'ATTENDANCE_SESSION_NOT_FOUND',
        'Không tìm thấy phiên điểm danh',
        HttpStatus.NOT_FOUND,
      );
    }

    return session;
  }

  private handleSessionConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'ATTENDANCE_SESSION_CONFLICT',
        'Đã có phiên điểm danh cho lớp môn vào ngày và tiết này',
        HttpStatus.CONFLICT,
      );
    }
  }
}
