import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcademicEntityStatus,
  EnrollmentStatus,
  Prisma,
  SummaryStatus,
} from '@prisma/client';

import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import {
  conductRecordListInclude,
  toConductRecordResponse,
  type ConductRecordResponse,
} from '@/modules/conduct-records/mappers/conduct-record.mapper';
import type {
  BulkUpsertConductRecordsInput,
  FinalizeConductRecordsInput,
  ListConductRecordsQuery,
} from '@/modules/conduct-records/schemas/conduct-record.schema';

interface BulkUpsertOptions {
  recordedByTeacherId?: string;
  requireHomeroomTeacherId?: string;
}

@Injectable()
export class ConductRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    schoolId: string,
    query: ListConductRecordsQuery,
  ): Promise<{
    items: ConductRecordResponse[];
    meta: ReturnType<typeof buildPaginationMeta>;
  }> {
    const where: Prisma.StudentConductRecordWhereInput = {
      schoolId,
      semesterId: query.semesterId,
      ...(query.homeroomClassId
        ? { homeroomClassId: query.homeroomClassId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            student: {
              fullName: { contains: query.search, mode: 'insensitive' },
            },
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.studentConductRecord.count({ where }),
      this.prisma.studentConductRecord.findMany({
        where,
        include: conductRecordListInclude,
        orderBy: [
          { homeroomClass: { code: 'asc' } },
          { student: { fullName: 'asc' } },
        ],
        skip: getSkip(query.page, query.limit),
        take: query.limit,
      }),
    ]);

    return {
      items: rows.map(toConductRecordResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(schoolId: string, id: string): Promise<ConductRecordResponse> {
    const row = await this.prisma.studentConductRecord.findFirst({
      where: { id, schoolId },
      include: conductRecordListInclude,
    });

    if (!row) {
      throw new AppException(
        'CONDUCT_RECORD_NOT_FOUND',
        'Không tìm thấy bản ghi hạnh kiểm',
        HttpStatus.NOT_FOUND,
      );
    }

    return toConductRecordResponse(row);
  }

  async bulkUpsert(
    schoolId: string,
    input: BulkUpsertConductRecordsInput,
    options: BulkUpsertOptions = {},
  ): Promise<ConductRecordResponse[]> {
    await this.assertHomeroomClassScope(
      schoolId,
      input.homeroomClassId,
      input.semesterId,
      options.requireHomeroomTeacherId,
    );

    const enrolledStudentIds = await this.getEnrolledStudentIds(
      schoolId,
      input.semesterId,
      input.homeroomClassId,
    );

    // Kiểm tra HS có thuộc lớp này không
    for (const record of input.records) {
      if (!enrolledStudentIds.has(record.studentId)) {
        throw new AppException(
          'STUDENT_NOT_ENROLLED',
          'Học sinh không thuộc lớp chủ nhiệm trong học kỳ này',
          HttpStatus.UNPROCESSABLE_ENTITY,
          [{ field: 'records.studentId', message: record.studentId }],
        );
      }
    }

    const closedStudentIds = await this.findClosedStudentIds(
      schoolId,
      input.semesterId,
      input.records.map((row) => row.studentId),
    );

    if (closedStudentIds.size > 0) {
      throw new AppException(
        'CONDUCT_RECORD_CLOSED',
        'Hạnh kiểm đã khóa — không thể sửa',
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.$transaction(
      input.records.map((record) =>
        this.prisma.studentConductRecord.upsert({
          where: {
            studentId_semesterId: {
              studentId: record.studentId,
              semesterId: input.semesterId,
            },
          },
          create: {
            schoolId,
            studentId: record.studentId,
            semesterId: input.semesterId,
            homeroomClassId: input.homeroomClassId,
            trainingResultLevel: record.trainingResultLevel,
            note: record.note ?? null,
            recordedByTeacherId: options.recordedByTeacherId ?? null,
            status: SummaryStatus.DRAFT,
          },
          update: {
            homeroomClassId: input.homeroomClassId,
            trainingResultLevel: record.trainingResultLevel,
            note: record.note ?? null,
            recordedByTeacherId: options.recordedByTeacherId ?? null,
          },
        }),
      ),
    );

    const rows = await this.prisma.studentConductRecord.findMany({
      where: {
        schoolId,
        semesterId: input.semesterId,
        homeroomClassId: input.homeroomClassId,
        studentId: { in: input.records.map((row) => row.studentId) },
      },
      include: conductRecordListInclude,
      orderBy: { student: { fullName: 'asc' } },
    });

    return rows.map(toConductRecordResponse);
  }

  async finalizeSemester(
    schoolId: string,
    semesterId: string,
    input: FinalizeConductRecordsInput,
    options: BulkUpsertOptions = {},
  ): Promise<{ closedCount: number }> {
    await this.assertHomeroomClassScope(
      schoolId,
      input.homeroomClassId,
      semesterId,
      options.requireHomeroomTeacherId,
    );

    const result = await this.prisma.studentConductRecord.updateMany({
      where: {
        schoolId,
        semesterId,
        homeroomClassId: input.homeroomClassId,
        status: SummaryStatus.DRAFT,
      },
      data: {
        status: SummaryStatus.CLOSED,
      },
    });

    return { closedCount: result.count };
  }

  async listHomeroomGrid(
    schoolId: string,
    semesterId: string,
    homeroomClassId: string,
    requireHomeroomTeacherId?: string,
  ): Promise<ConductRecordResponse[]> {
    await this.assertHomeroomClassScope(
      schoolId,
      homeroomClassId,
      semesterId,
      requireHomeroomTeacherId,
    );

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId,
        homeroomClassId,
        status: EnrollmentStatus.ACTIVE,
      },
      select: {
        studentId: true,
        student: { select: { fullName: true } },
      },
      orderBy: { student: { fullName: 'asc' } },
    });

    const existing = await this.prisma.studentConductRecord.findMany({
      where: {
        schoolId,
        semesterId,
        homeroomClassId,
        studentId: { in: enrollments.map((row) => row.studentId) },
      },
      include: conductRecordListInclude,
    });

    const homeroomClass = await this.prisma.homeroomClass.findFirst({
      where: { id: homeroomClassId, schoolId },
      select: { code: true },
    });

    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, schoolId },
      select: { name: true },
    });

    const existingByStudentId = new Map(
      existing.map((row) => [row.studentId, row]),
    );

    return enrollments.map((enrollment) => {
      const row = existingByStudentId.get(enrollment.studentId);

      if (row) {
        return toConductRecordResponse(row);
      }

      return {
        id: '',
        studentId: enrollment.studentId,
        studentFullName: enrollment.student.fullName,
        semesterId,
        semesterName: semester?.name ?? '',
        homeroomClassId,
        homeroomClassCode: homeroomClass?.code ?? '',
        trainingResultLevel: 'SATISFACTORY' as const,
        note: null,
        recordedByTeacherId: null,
        recordedByTeacherName: null,
        status: SummaryStatus.DRAFT,
        createdAt: '',
        updatedAt: '',
      };
    });
  }

  private async assertHomeroomClassScope(
    schoolId: string,
    homeroomClassId: string,
    semesterId: string,
    requireHomeroomTeacherId?: string,
  ): Promise<void> {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, schoolId },
      select: { academicYearId: true },
    });

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Không tìm thấy học kỳ',
        HttpStatus.NOT_FOUND,
      );
    }

    const homeroomClass = await this.prisma.homeroomClass.findFirst({
      where: {
        id: homeroomClassId,
        schoolId,
        academicYearId: semester.academicYearId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        id: true,
        homeroomTeacherId: true,
      },
    });

    if (!homeroomClass) {
      throw new AppException(
        'HOMEROOM_CLASS_NOT_FOUND',
        'Không tìm thấy lớp chủ nhiệm',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      requireHomeroomTeacherId &&
      homeroomClass.homeroomTeacherId !== requireHomeroomTeacherId
    ) {
      throw new AppException(
        'FORBIDDEN_SCOPE',
        'Bạn không có quyền thao tác lớp chủ nhiệm này',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async getEnrolledStudentIds(
    schoolId: string,
    semesterId: string,
    homeroomClassId: string,
  ): Promise<Set<string>> {
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId,
        homeroomClassId,
        status: EnrollmentStatus.ACTIVE,
      },
      select: { studentId: true },
    });

    return new Set(enrollments.map((row) => row.studentId));
  }

  private async findClosedStudentIds(
    schoolId: string,
    semesterId: string,
    studentIds: string[],
  ): Promise<Set<string>> {
    const rows = await this.prisma.studentConductRecord.findMany({
      where: {
        schoolId,
        semesterId,
        studentId: { in: studentIds },
        status: SummaryStatus.CLOSED,
      },
      select: { studentId: true },
    });

    return new Set(rows.map((row) => row.studentId));
  }
}
