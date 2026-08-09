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
  ENROLLMENT_EXPORT_COLUMNS,
  ENROLLMENT_EXPORT_FILENAMES,
  ENROLLMENT_EXPORT_SHEET_NAME,
} from '@/modules/exports/constants/enrollments-export.constants';
import type { ExportEnrollmentsQuery } from '@/modules/exports/schemas/enrollments-export.schema';

export interface EnrollmentsExportFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

const enrollmentExportInclude = {
  student: {
    select: { fullName: true, externalCode: true },
  },
  homeroomClass: {
    select: { code: true, name: true },
  },
  semester: {
    select: {
      name: true,
      academicYear: { select: { name: true } },
    },
  },
} as const;

type EnrollmentForExport = Prisma.StudentEnrollmentGetPayload<{
  include: typeof enrollmentExportInclude;
}>;

@Injectable()
export class EnrollmentsExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportEnrollments(
    schoolId: string,
    query: ExportEnrollmentsQuery,
  ): Promise<EnrollmentsExportFile> {
    const enrollments = await this.findEnrollmentsForExport(schoolId, query);
    const rows = enrollments.map((enrollment) =>
      this.toExportRow(enrollment),
    );
    const metadata = await this.buildMetadata(schoolId, query, rows.length);

    const buffer =
      query.format === 'csv'
        ? createCsvBuffer({
            columns: ENROLLMENT_EXPORT_COLUMNS,
            rows,
            preambleLines: this.metadataToPreamble(metadata),
          })
        : await new WorkbookBuilder()
            .addSheetFromRowsWithMetadata(
              ENROLLMENT_EXPORT_SHEET_NAME,
              ENROLLMENT_EXPORT_COLUMNS,
              rows,
              metadata,
            )
            .toBuffer();

    return {
      buffer,
      contentType:
        query.format === 'csv' ? getCsvContentType() : getXlsxContentType(),
      filename: ENROLLMENT_EXPORT_FILENAMES[query.format],
    };
  }

  private async findEnrollmentsForExport(
    schoolId: string,
    query: ExportEnrollmentsQuery,
  ): Promise<EnrollmentForExport[]> {
    const where: Prisma.StudentEnrollmentWhereInput = {
      schoolId,
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
      ...(query.homeroomClassId
        ? { homeroomClassId: query.homeroomClassId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.academicYearId
        ? { semester: { academicYearId: query.academicYearId } }
        : {}),
    };

    return this.prisma.studentEnrollment.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      include: enrollmentExportInclude,
    });
  }

  private toExportRow(enrollment: EnrollmentForExport) {
    return {
      ma_hs: enrollment.student.externalCode ?? '',
      ho_ten: enrollment.student.fullName,
      ma_lop_hc: enrollment.homeroomClass.code,
      ten_lop_hc: enrollment.homeroomClass.name,
      hoc_ky: enrollment.semester.name,
      nam_hoc: enrollment.semester.academicYear.name,
      ngay_ghi_danh: toIsoDateString(enrollment.enrolledAt),
      ngay_roi: enrollment.leftAt
        ? toIsoDateString(enrollment.leftAt)
        : '',
      trang_thai: enrollment.status,
      ghi_chu: enrollment.note ?? '',
    };
  }

  private async buildMetadata(
    schoolId: string,
    query: ExportEnrollmentsQuery,
    totalCount: number,
  ): Promise<SpreadsheetSheetMetadata> {
    const [school, academicYear, semester, homeroomClass] = await Promise.all([
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
      query.homeroomClassId
        ? this.prisma.homeroomClass.findFirst({
            where: { id: query.homeroomClassId, schoolId },
            select: { code: true, name: true },
          })
        : Promise.resolve(null),
    ]);

    return {
      title: 'DANH SÁCH GHI DANH',
      lines: [
        { label: 'Trường', value: school?.name ?? '—' },
        { label: 'Năm học', value: academicYear?.name ?? 'Tất cả' },
        { label: 'Học kỳ', value: semester?.name ?? 'Tất cả' },
        {
          label: 'Lớp HC',
          value: homeroomClass
            ? `${homeroomClass.code} (${homeroomClass.name})`
            : 'Tất cả',
        },
        { label: 'Trạng thái', value: query.status ?? 'Tất cả' },
        { label: 'Tổng số ghi danh', value: String(totalCount) },
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
