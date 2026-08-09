import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import {
  createCsvBuffer,
  getCsvContentType,
  getXlsxContentType,
} from '@/common/files/csv-writer.util';
import type { SpreadsheetSheetMetadata } from '@/common/files/file-format.types';
import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import { PrismaService } from '@/common/database/prisma.service';
import { toIsoDateString } from '@/common/schemas/academic.schema';
import {
  ATTENDANCE_EXPORT_COLUMNS,
  ATTENDANCE_EXPORT_FILENAMES,
  ATTENDANCE_EXPORT_SHEET_NAME,
} from '@/modules/exports/constants/attendance-export.constants';
import type { ExportAttendanceQuery } from '@/modules/exports/schemas/attendance-export.schema';

export interface AttendanceExportFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

const attendanceRecordInclude = {
  student: {
    select: { fullName: true, externalCode: true },
  },
  session: {
    select: {
      sessionDate: true,
      periodNumber: true,
      status: true,
      courseSection: {
        select: {
          code: true,
          name: true,
          homeroomClass: { select: { code: true } },
        },
      },
    },
  },
} as const;

type AttendanceRecordForExport = Prisma.AttendanceRecordGetPayload<{
  include: typeof attendanceRecordInclude;
}>;

@Injectable()
export class AttendanceExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportAttendance(
    schoolId: string,
    query: ExportAttendanceQuery,
  ): Promise<AttendanceExportFile> {
    const records = await this.findRecordsForExport(schoolId, query);
    const rows = records.map((record) => this.toExportRow(record));
    const metadata = await this.buildMetadata(schoolId, query, rows.length);

    const buffer =
      query.format === 'csv'
        ? createCsvBuffer({
            columns: ATTENDANCE_EXPORT_COLUMNS,
            rows,
            preambleLines: this.metadataToPreamble(metadata),
          })
        : await new WorkbookBuilder()
            .addSheetFromRowsWithMetadata(
              ATTENDANCE_EXPORT_SHEET_NAME,
              ATTENDANCE_EXPORT_COLUMNS,
              rows,
              metadata,
            )
            .toBuffer();

    return {
      buffer,
      contentType:
        query.format === 'csv' ? getCsvContentType() : getXlsxContentType(),
      filename: ATTENDANCE_EXPORT_FILENAMES[query.format],
    };
  }

  private async findRecordsForExport(
    schoolId: string,
    query: ExportAttendanceQuery,
  ): Promise<AttendanceRecordForExport[]> {
    const sessionWhere: Prisma.AttendanceSessionWhereInput = {
      schoolId,
      ...(query.courseSectionId
        ? { courseSectionId: query.courseSectionId }
        : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.sessionDate
        ? { sessionDate: query.sessionDate }
        : query.fromDate || query.toDate
          ? {
              sessionDate: {
                ...(query.fromDate ? { gte: query.fromDate } : {}),
                ...(query.toDate ? { lte: query.toDate } : {}),
              },
            }
          : {}),
      ...(query.academicYearId
        ? { semester: { academicYearId: query.academicYearId } }
        : {}),
      ...(query.homeroomClassId
        ? {
            courseSection: {
              homeroomClassId: query.homeroomClassId,
            },
          }
        : {}),
    };

    return this.prisma.attendanceRecord.findMany({
      where: { schoolId, session: sessionWhere },
      orderBy: [
        { session: { [query.sortBy]: query.sortOrder } },
        { session: { periodNumber: 'asc' } },
        { student: { fullName: 'asc' } },
      ],
      include: attendanceRecordInclude,
    });
  }

  private toExportRow(record: AttendanceRecordForExport) {
    const session = record.session;
    const courseSection = session.courseSection;

    return {
      ngay: toIsoDateString(session.sessionDate),
      tiet: String(session.periodNumber),
      ma_lop_mon: courseSection.code,
      ten_lop_mon: courseSection.name,
      ma_lop_hc: courseSection.homeroomClass?.code ?? '',
      ma_hs: record.student.externalCode ?? '',
      ho_ten: record.student.fullName,
      trang_thai: record.status,
      ghi_chu: record.note ?? '',
    };
  }

  private async buildMetadata(
    schoolId: string,
    query: ExportAttendanceQuery,
    totalCount: number,
  ): Promise<SpreadsheetSheetMetadata> {
    const [school, academicYear, semester] = await Promise.all([
      this.prisma.school.findFirst({
        where: { id: schoolId },
        select: { name: true },
      }),
      query.academicYearId
        ? this.prisma.academicYear.findFirst({
            where: { id: query.academicYearId, schoolId },
            select: { name: true },
          })
        : Promise.resolve(null),
      query.semesterId
        ? this.prisma.semester.findFirst({
            where: { id: query.semesterId, schoolId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);

    const dateRange =
      query.fromDate && query.toDate
        ? `${query.fromDate} → ${query.toDate}`
        : query.sessionDate
          ? query.sessionDate
          : 'Tất cả';

    return {
      title: 'BÁO CÁO ĐIỂM DANH',
      lines: [
        { label: 'Trường', value: school?.name ?? '—' },
        { label: 'Năm học', value: academicYear?.name ?? 'Tất cả' },
        { label: 'Học kỳ', value: semester?.name ?? 'Tất cả' },
        { label: 'Khoảng ngày', value: dateRange },
        { label: 'Trạng thái phiên', value: query.status ?? 'Tất cả' },
        { label: 'Tổng số dòng', value: String(totalCount) },
        {
          label: 'Ngày xuất',
          value: new Date().toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
          }),
        },
      ],
    };
  }

  private metadataToPreamble(metadata: SpreadsheetSheetMetadata): string[] {
    return [
      metadata.title,
      ...metadata.lines.map((line) => `${line.label}: ${line.value}`),
    ];
  }
}
