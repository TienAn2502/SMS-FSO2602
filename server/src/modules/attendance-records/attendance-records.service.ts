import { HttpStatus, Injectable } from '@nestjs/common';
import { AttendanceRecordStatus, EnrollmentStatus } from '@prisma/client';

import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import {
  attendanceSessionDetailInclude,
  toAttendanceSessionDetailResponse,
  type AttendanceSessionDetailResponse,
} from '@/modules/attendance-sessions/mappers/attendance-session.mapper';
import {
  attendanceRecordInclude,
  toAttendanceRecordResponse,
  type AttendanceRecordResponse,
} from '@/modules/attendance-records/mappers/attendance-record.mapper';
import type {
  BulkUpsertAttendanceRecordsInput,
  UpdateAttendanceRecordInput,
} from '@/modules/attendance-records/schemas/attendance-record.schema';

@Injectable()
export class AttendanceRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async bulkUpsert(
    schoolId: string,
    sessionId: string,
    input: BulkUpsertAttendanceRecordsInput,
  ): Promise<AttendanceSessionDetailResponse> {
    // Tìm phiên điểm danh
    const session = await this.findSessionForRecords(schoolId, sessionId);

    // Lấy danh sách học sinh thuộc lớp hành chính của lớp môn
    const enrolledStudentIds = await this.getEnrolledStudentIds(
      schoolId,
      session.semesterId,
      session.courseSection.homeroomClassId,
    );

    // Kiểm tra học sinh có thuộc lớp hành chính của lớp môn không
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

    await this.prisma.$transaction(
      input.records.map((record) =>
        this.prisma.attendanceRecord.update({
          where: {
            sessionId_studentId: {
              sessionId,
              studentId: record.studentId,
            },
          },
          data: record,
        }),
      ),
    );

    return this.getSessionDetail(schoolId, sessionId);
  }

  async initializeSessionRecords(
    schoolId: string,
    sessionId: string,
  ): Promise<AttendanceSessionDetailResponse> {
    const session = await this.findSessionForRecords(schoolId, sessionId);
    const enrolledStudentIds = await this.getEnrolledStudentIds(
      schoolId,
      session.semesterId,
      session.courseSection.homeroomClassId,
    );

    await this.prisma.attendanceRecord.createMany({
      data: [...enrolledStudentIds].map((studentId) => ({
        schoolId,
        sessionId,
        studentId,
        status: AttendanceRecordStatus.PRESENT,
      })),
      skipDuplicates: true,
    });

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
