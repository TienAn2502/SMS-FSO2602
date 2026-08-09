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
  YEAR_SUMMARY_EXPORT_COLUMNS,
  YEAR_SUMMARY_EXPORT_FILENAMES,
  YEAR_SUMMARY_EXPORT_SHEET_NAME,
} from '@/modules/exports/constants/year-summaries-export.constants';
import type { ExportYearSummariesQuery } from '@/modules/exports/schemas/year-summaries-export.schema';
import { yearSummaryListInclude } from '@/modules/grade-summaries/mappers/grade-summary.mapper';

export interface YearSummariesExportFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

type YearSummaryForExport = Prisma.StudentYearSummaryGetPayload<{
  include: typeof yearSummaryListInclude;
}>;

@Injectable()
export class YearSummariesExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportYearSummaries(
    schoolId: string,
    query: ExportYearSummariesQuery,
  ): Promise<YearSummariesExportFile> {
    const summaries = await this.findSummariesForExport(schoolId, query);
    const studentCodes = await this.loadStudentExternalCodes(
      schoolId,
      summaries.map((summary) => summary.studentId),
    );

    const rows = summaries.map((summary) => ({
      ma_hs: studentCodes.get(summary.studentId) ?? '',
      ho_ten: summary.student.fullName,
      ma_lop_hc: summary.homeroomClass.code,
      khoi: summary.homeroomClass.gradeLevel.code,
      nam_hoc: summary.academicYear.name,
      tb_chung: summary.overallAverage?.toString() ?? '',
      hoc_luc: summary.academicResultLevel ?? '',
      hanh_kiem: summary.trainingResultLevel ?? '',
      quyet_dinh: summary.promotionDecision,
      lop_nam_sau: summary.nextHomeroomClass?.code ?? '',
      so_buoi_vang: summary.absentSessionCount?.toString() ?? '',
      trang_thai: summary.status,
    }));

    const metadata = await this.buildMetadata(schoolId, query, rows.length);

    const buffer =
      query.format === 'csv'
        ? createCsvBuffer({
            columns: YEAR_SUMMARY_EXPORT_COLUMNS,
            rows,
            preambleLines: this.metadataToPreamble(metadata),
          })
        : await new WorkbookBuilder()
            .addSheetFromRowsWithMetadata(
              YEAR_SUMMARY_EXPORT_SHEET_NAME,
              YEAR_SUMMARY_EXPORT_COLUMNS,
              rows,
              metadata,
            )
            .toBuffer();

    return {
      buffer,
      contentType:
        query.format === 'csv' ? getCsvContentType() : getXlsxContentType(),
      filename: YEAR_SUMMARY_EXPORT_FILENAMES[query.format],
    };
  }

  private async findSummariesForExport(
    schoolId: string,
    query: ExportYearSummariesQuery,
  ): Promise<YearSummaryForExport[]> {
    const where: Prisma.StudentYearSummaryWhereInput = {
      schoolId,
      ...(query.academicYearId
        ? { academicYearId: query.academicYearId }
        : {}),
      ...(query.homeroomClassId
        ? { homeroomClassId: query.homeroomClassId }
        : {}),
      ...(query.promotionDecision
        ? { promotionDecision: query.promotionDecision }
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

    return this.prisma.studentYearSummary.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      include: yearSummaryListInclude,
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
    query: ExportYearSummariesQuery,
    totalCount: number,
  ): Promise<SpreadsheetSheetMetadata> {
    const [school, academicYear, homeroomClass] = await Promise.all([
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
      query.homeroomClassId
        ? this.prisma.homeroomClass.findFirst({
            where: { id: query.homeroomClassId, schoolId },
            select: { code: true, name: true },
          })
        : Promise.resolve(null),
    ]);

    return {
      title: 'TỔNG KẾT NĂM HỌC',
      lines: [
        { label: 'Trường', value: school?.name ?? '—' },
        { label: 'Năm học', value: academicYear?.name ?? 'Tất cả' },
        {
          label: 'Lớp HC',
          value: homeroomClass
            ? `${homeroomClass.code} (${homeroomClass.name})`
            : 'Tất cả',
        },
        {
          label: 'Quyết định',
          value: query.promotionDecision ?? 'Tất cả',
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
