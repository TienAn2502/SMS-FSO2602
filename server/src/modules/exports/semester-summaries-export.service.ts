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
import {
  SEMESTER_SUMMARY_EXPORT_COLUMNS,
  SEMESTER_SUMMARY_EXPORT_FILENAMES,
  SEMESTER_SUMMARY_EXPORT_SHEET_NAME,
} from '@/modules/exports/constants/semester-summaries-export.constants';
import type { ExportSemesterSummariesQuery } from '@/modules/exports/schemas/semester-summaries-export.schema';
import { semesterSummaryListInclude } from '@/modules/grade-summaries/mappers/grade-summary.mapper';

export interface SemesterSummariesExportFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

type SemesterSummaryForExport = Prisma.StudentSemesterSummaryGetPayload<{
  include: typeof semesterSummaryListInclude;
}>;

@Injectable()
export class SemesterSummariesExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportSemesterSummaries(
    schoolId: string,
    query: ExportSemesterSummariesQuery,
  ): Promise<SemesterSummariesExportFile> {
    const summaries = await this.findSummariesForExport(schoolId, query);
    const studentCodes = await this.loadStudentExternalCodes(
      schoolId,
      summaries.map((summary) => summary.studentId),
    );

    const rows = summaries.map((summary) => ({
      ma_hs: studentCodes.get(summary.studentId) ?? '',
      ho_ten: summary.student.fullName,
      ma_lop_hc: summary.homeroomClass.code,
      hoc_ky: summary.semester.name,
      tb_chung: summary.overallAverage?.toString() ?? '',
      hoc_luc: summary.academicResultLevel ?? '',
      hanh_kiem: summary.trainingResultLevel ?? '',
      so_mon: summary.subjectCount?.toString() ?? '',
      trang_thai: summary.status,
    }));

    const metadata = await this.buildMetadata(schoolId, query, rows.length);

    const buffer =
      query.format === 'csv'
        ? createCsvBuffer({
            columns: SEMESTER_SUMMARY_EXPORT_COLUMNS,
            rows,
            preambleLines: this.metadataToPreamble(metadata),
          })
        : await new WorkbookBuilder()
            .addSheetFromRowsWithMetadata(
              SEMESTER_SUMMARY_EXPORT_SHEET_NAME,
              SEMESTER_SUMMARY_EXPORT_COLUMNS,
              rows,
              metadata,
            )
            .toBuffer();

    return {
      buffer,
      contentType:
        query.format === 'csv' ? getCsvContentType() : getXlsxContentType(),
      filename: SEMESTER_SUMMARY_EXPORT_FILENAMES[query.format],
    };
  }

  private async findSummariesForExport(
    schoolId: string,
    query: ExportSemesterSummariesQuery,
  ): Promise<SemesterSummaryForExport[]> {
    const where: Prisma.StudentSemesterSummaryWhereInput = {
      schoolId,
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
      ...(query.homeroomClassId
        ? { homeroomClassId: query.homeroomClassId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            student: {
              fullName: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          }
        : {}),
    };

    return this.prisma.studentSemesterSummary.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      include: semesterSummaryListInclude,
    });
  }

  private async loadStudentExternalCodes(
    schoolId: string,
    studentIds: string[],
  ): Promise<Map<string, string>> {
    if (studentIds.length === 0) {
      return new Map();
    }

    const students = await this.prisma.student.findMany({
      where: { schoolId, id: { in: studentIds } },
      select: { id: true, externalCode: true },
    });

    return new Map(
      students.map((student) => [student.id, student.externalCode ?? '']),
    );
  }

  private async buildMetadata(
    schoolId: string,
    query: ExportSemesterSummariesQuery,
    totalCount: number,
  ): Promise<SpreadsheetSheetMetadata> {
    const [school, semester, homeroomClass] = await Promise.all([
      this.prisma.school.findFirst({
        where: { id: schoolId },
        select: { name: true },
      }),
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
      title: 'TỔNG KẾT HỌC KỲ',
      lines: [
        { label: 'Trường', value: school?.name ?? '—' },
        { label: 'Học kỳ', value: semester?.name ?? 'Tất cả' },
        {
          label: 'Lớp HC',
          value: homeroomClass
            ? `${homeroomClass.code} (${homeroomClass.name})`
            : 'Tất cả',
        },
        { label: 'Trạng thái', value: query.status ?? 'Tất cả' },
        { label: 'Tìm kiếm', value: query.search?.trim() || '—' },
        { label: 'Tổng số bản ghi', value: String(totalCount) },
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
