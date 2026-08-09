import { HttpStatus, Injectable } from '@nestjs/common';

import {
  createCsvBuffer,
  getCsvContentType,
  getXlsxContentType,
} from '@/common/files/csv-writer.util';
import type { SpreadsheetSheetMetadata } from '@/common/files/file-format.types';
import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import {
  allocateExcelSheetName,
  buildTimetableMatrix,
  formatHomeroomClassLabel,
  groupTimetableEntriesByHomeroomClass,
} from '@/common/utils/timetable-matrix.util';
import {
  TIMETABLE_EXPORT_FILENAMES,
  TIMETABLE_EXPORT_SHEET_NAME,
} from '@/modules/exports/constants/timetable-export.constants';
import type { ExportTimetableQuery } from '@/modules/exports/schemas/timetable-export.schema';
import type { TimetableEntryResponse } from '@/modules/timetable-entries/mappers/timetable-entry.mapper';
import { TimetableEntriesService } from '@/modules/timetable-entries/timetable-entries.service';

export interface TimetableExportFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

interface TimetableExportContext {
  academicYearName: string;
  semesterName: string;
  homeroomClass: { code: string; name: string } | null;
  teacherFullName: string | null;
}

@Injectable()
export class TimetableExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timetableEntriesService: TimetableEntriesService,
  ) {}

  async exportTimetable(
    schoolId: string,
    query: ExportTimetableQuery,
  ): Promise<TimetableExportFile> {
    const { format, ...matrixQuery } = query;
    const entries = await this.timetableEntriesService.listForMatrix(
      schoolId,
      { ...matrixQuery, includeAllSemesters: false },
    );

    if (entries.length === 0) {
      throw new AppException(
        'TIMETABLE_EXPORT_EMPTY',
        'Không có tiết học để export với bộ lọc đã chọn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const context = await this.resolveExportContext(schoolId, query, entries);

    if (this.shouldExportPerHomeroomClass(query)) {
      return this.exportGroupedByHomeroomClass(
        schoolId,
        entries,
        context,
        format,
      );
    }

    const metadata = this.buildSheetMetadata(context, entries);
    return this.buildExportFile(entries, metadata, format);
  }

  async exportTimetableEntries(
    entries: TimetableEntryResponse[],
    metadata: SpreadsheetSheetMetadata,
    format: ExportTimetableQuery['format'],
  ): Promise<TimetableExportFile> {
    return this.buildExportFile(entries, metadata, format);
  }

  private shouldExportPerHomeroomClass(query: ExportTimetableQuery): boolean {
    return (
      !query.homeroomClassId && !query.teacherId && !query.courseSectionId
    );
  }

  private async exportGroupedByHomeroomClass(
    schoolId: string,
    entries: TimetableEntryResponse[],
    context: TimetableExportContext,
    format: ExportTimetableQuery['format'],
  ): Promise<TimetableExportFile> {
    const homeroomClassIds = [
      ...new Set(
        entries
          .map((entry) => entry.homeroomClassId)
          .filter((homeroomClassId): homeroomClassId is string =>
            Boolean(homeroomClassId),
          ),
      ),
    ];

    const homeroomClasses = homeroomClassIds.length
      ? await this.prisma.homeroomClass.findMany({
          where: { id: { in: homeroomClassIds }, schoolId },
          select: { id: true, code: true, name: true },
        })
      : [];

    const homeroomClassById = new Map(
      homeroomClasses.map((homeroomClass) => [
        homeroomClass.id,
        { code: homeroomClass.code, name: homeroomClass.name },
      ]),
    );

    const groups = groupTimetableEntriesByHomeroomClass(
      entries,
      homeroomClassById,
    );

    if (format === 'csv') {
      const sections = groups.map((group) => {
        const metadata = this.buildSheetMetadata(context, group.entries, {
          code: group.homeroomClassCode,
          name: group.homeroomClassName,
        });
        const { columns, rows } = buildTimetableMatrix(group.entries);

        return createCsvBuffer({
          columns,
          rows,
          includeBom: false,
          preambleLines: [
            metadata.title,
            ...metadata.lines.map((line) => `${line.label}: ${line.value}`),
          ],
        }).toString('utf8');
      });

      return {
        buffer: Buffer.from(`\uFEFF${sections.join('\n\n')}`, 'utf8'),
        contentType: getCsvContentType(),
        filename: TIMETABLE_EXPORT_FILENAMES.csv,
      };
    }

    const builder = new WorkbookBuilder();
    const usedSheetNames = new Set<string>();

    for (const group of groups) {
      const metadata = this.buildSheetMetadata(context, group.entries, {
        code: group.homeroomClassCode,
        name: group.homeroomClassName,
      });
      const { columns, rows } = buildTimetableMatrix(group.entries);
      const sheetName = allocateExcelSheetName(
        group.homeroomClassCode,
        usedSheetNames,
      );

      builder.addSheetFromRowsWithMetadata(
        sheetName,
        columns,
        rows,
        metadata,
      );
    }

    return {
      buffer: await builder.toBuffer(),
      contentType: getXlsxContentType(),
      filename: TIMETABLE_EXPORT_FILENAMES.xlsx,
    };
  }

  private async buildExportFile(
    entries: TimetableEntryResponse[],
    metadata: SpreadsheetSheetMetadata,
    format: ExportTimetableQuery['format'],
  ): Promise<TimetableExportFile> {
    const { columns, rows } = buildTimetableMatrix(entries);

    const buffer =
      format === 'csv'
        ? createCsvBuffer({
            columns,
            rows,
            preambleLines: [
              metadata.title,
              ...metadata.lines.map(
                (line) => `${line.label}: ${line.value}`,
              ),
            ],
          })
        : await new WorkbookBuilder()
            .addSheetFromRowsWithMetadata(
              TIMETABLE_EXPORT_SHEET_NAME,
              columns,
              rows,
              metadata,
            )
            .toBuffer();

    return {
      buffer,
      contentType:
        format === 'csv' ? getCsvContentType() : getXlsxContentType(),
      filename: TIMETABLE_EXPORT_FILENAMES[format],
    };
  }

  private async resolveExportContext(
    schoolId: string,
    query: ExportTimetableQuery,
    entries: TimetableEntryResponse[],
  ): Promise<TimetableExportContext> {
    const [homeroomClass, teacher, semester, academicYear] = await Promise.all([
      query.homeroomClassId
        ? this.prisma.homeroomClass.findFirst({
            where: { id: query.homeroomClassId, schoolId },
            select: { code: true, name: true },
          })
        : Promise.resolve(null),
      query.teacherId
        ? this.prisma.teacher.findFirst({
            where: { id: query.teacherId, schoolId },
            select: { fullName: true },
          })
        : Promise.resolve(null),
      query.semesterId
        ? this.prisma.semester.findFirst({
            where: { id: query.semesterId, schoolId },
            select: { name: true, academicYearId: true },
          })
        : entries[0]?.semesterId
          ? this.prisma.semester.findFirst({
              where: { id: entries[0].semesterId, schoolId },
              select: { name: true, academicYearId: true },
            })
          : Promise.resolve(null),
      query.academicYearId
        ? this.prisma.academicYear.findFirst({
            where: { id: query.academicYearId, schoolId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);

    let academicYearName = academicYear?.name ?? '—';
    if (!academicYear && semester?.academicYearId) {
      const resolvedYear = await this.prisma.academicYear.findFirst({
        where: { id: semester.academicYearId, schoolId },
        select: { name: true },
      });
      academicYearName = resolvedYear?.name ?? '—';
    }

    return {
      academicYearName,
      semesterName: semester?.name ?? '—',
      homeroomClass,
      teacherFullName: teacher?.fullName ?? null,
    };
  }

  private buildSheetMetadata(
    context: TimetableExportContext,
    entries: TimetableEntryResponse[],
    groupHomeroomClass?: { code: string; name: string },
  ): SpreadsheetSheetMetadata {
    const homeroomClass = groupHomeroomClass ?? context.homeroomClass;
    const lines = [
      { label: 'Năm học', value: context.academicYearName },
      { label: 'Học kỳ', value: context.semesterName },
    ];

    if (homeroomClass) {
      lines.unshift({
        label: 'Lớp HC',
        value: formatHomeroomClassLabel(
          homeroomClass.code,
          homeroomClass.name,
        ),
      });
    }

    if (context.teacherFullName) {
      lines.push({ label: 'Giáo viên', value: context.teacherFullName });
    }

    lines.push({ label: 'Số tiết', value: String(entries.length) });

    return {
      title: 'THỜI KHÓA BIỂU',
      lines,
    };
  }
}
