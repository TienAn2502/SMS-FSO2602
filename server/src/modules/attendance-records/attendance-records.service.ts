import { HttpStatus, Injectable } from '@nestjs/common';
import { AttendanceRecordStatus, EnrollmentStatus } from '@prisma/client';

import { PrismaService } from '../../common/database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import {
  attendanceSessionDetailInclude,
  toAttendanceSessionDetailResponse,
  type AttendanceSessionDetailResponse,
} from '../attendance-sessions/mappers/attendance-session.mapper';
import {
  attendanceRecordInclude,
  toAttendanceRecordResponse,
  type AttendanceRecordResponse,
} from './mappers/attendance-record.mapper';
import type {
  BulkUpsertAttendanceRecordsInput,
  UpdateAttendanceRecordInput,
} from './schemas/attendance-record.schema';

@Injectable()
export class AttendanceRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async bulkUpsert(
    schoolId: string,
    sessionId: string,
    input: BulkUpsertAttendanceRecordsInput,
  ): Promise<AttendanceSessionDetailResponse> {
    const session = await this.findSessionForRecords(schoolId, sessionId);

    const enrolledStudentIds = await this.getEnrolledStudentIds(
      schoolId,
      session.semesterId,
      session.courseSection.homeroomClassId,
    );

    for (const record of input.records) {
      if (!enrolledStudentIds.has(record.studentId)) {
        throw new AppException(
          'STUDENT_NOT_ENROLLED',
          'Học sinh không thuộc lớp hành chính của lớp môn',
          HttpStatus.UNPROCESSABLE_ENTITY,
          [{ field: 'records.studentId', message: record.studentId }],
        );
      }
    }

    const toUpsert = this.buildUpsertItems(input, enrolledStudentIds);

    await this.prisma.$transaction(
      toUpsert.map((item) =>
        this.prisma.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId,
              studentId: item.studentId,
            },
          },
          create: {
            schoolId,
            sessionId,
            studentId: item.studentId,
            status: item.status,
            note: item.note ?? null,
          },
          update: {
            status: item.status,
            ...(item.note !== undefined ? { note: item.note } : {}),
          },
        }),
      ),
    );

    return this.getSessionDetail(schoolId, sessionId);
  }

  async update(
    schoolId: string,
    recordId: string,
    input: UpdateAttendanceRecordInput,
  ): Promise<AttendanceRecordResponse> {
    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { id: recordId, schoolId },
      include: {
        session: {
          select: {
            status: true,
            semesterId: true,
            courseSection: {
              select: { homeroomClassId: true },
            },
          },
        },
        student: attendanceRecordInclude.student,
      },
    });

    if (!existing) {
      throw new AppException(
        'ATTENDANCE_RECORD_NOT_FOUND',
        'Không tìm thấy bản ghi điểm danh',
        HttpStatus.NOT_FOUND,
      );
    }

    if (input.status !== undefined) {
      // kiểm tra học sinh còn ghi danh ACTIVE trong lớp hành chính
      const enrolledStudentIds = await this.getEnrolledStudentIds(
        schoolId,
        existing.session.semesterId,
        existing.session.courseSection.homeroomClassId,
      );

      if (!enrolledStudentIds.has(existing.studentId)) {
        throw new AppException(
          'STUDENT_NOT_ENROLLED',
          'Học sinh không còn ghi danh ACTIVE trong lớp hành chính',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    const updated = await this.prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
      include: attendanceRecordInclude,
    });

    return toAttendanceRecordResponse(updated);
  }

  // khởi tạo danh sách HS còn thiếu (initMissingStudents: true)
  private buildUpsertItems(
    input: BulkUpsertAttendanceRecordsInput,
    enrolledStudentIds: Set<string>,
  ): Array<{
    studentId: string;
    status: AttendanceRecordStatus;
    note?: string | null;
  }> {
    const items: Array<{
      studentId: string;
      status: AttendanceRecordStatus;
      note?: string | null;
    }> = input.records.map((record) => ({
      studentId: record.studentId,
      status: record.status,
      ...(record.note !== undefined ? { note: record.note } : {}),
    }));

    if (!input.initMissingStudents) {
      return items;
    }

    const providedIds = new Set(items.map((item) => item.studentId));

    for (const studentId of enrolledStudentIds) {
      if (!providedIds.has(studentId)) {
        items.push({
          studentId,
          status: AttendanceRecordStatus.PRESENT,
        });
      }
    }

    return items;
  }

  private async getEnrolledStudentIds(
    schoolId: string,
    semesterId: string,
    homeroomClassId: string | null,
  ): Promise<Set<string>> {
    if (!homeroomClassId) {
      throw new AppException(
        'COURSE_SECTION_NO_HOMEROOM',
        'Lớp môn chưa gắn lớp hành chính — không thể điểm danh',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId,
        homeroomClassId,
        status: EnrollmentStatus.ACTIVE,
      },
      select: { studentId: true },
    });

    if (enrollments.length === 0) {
      throw new AppException(
        'NO_ACTIVE_ENROLLMENTS',
        'Không có học sinh ghi danh ACTIVE trong lớp hành chính',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return new Set(enrollments.map((enrollment) => enrollment.studentId));
  }

  private async findSessionForRecords(schoolId: string, sessionId: string) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: sessionId, schoolId },
      select: {
        id: true,
        status: true,
        semesterId: true,
        courseSection: {
          select: { homeroomClassId: true },
        },
      },
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

  private async getSessionDetail(
    schoolId: string,
    sessionId: string,
  ): Promise<AttendanceSessionDetailResponse> {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: sessionId, schoolId },
      include: attendanceSessionDetailInclude,
    });

    if (!session) {
      throw new AppException(
        'ATTENDANCE_SESSION_NOT_FOUND',
        'Không tìm thấy phiên điểm danh',
        HttpStatus.NOT_FOUND,
      );
    }

    return toAttendanceSessionDetailResponse(session);
  }
}
