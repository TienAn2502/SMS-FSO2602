import { Injectable } from '@nestjs/common';

import {
  createCsvBuffer,
  getCsvContentType,
  getXlsxContentType,
} from '@/common/files/csv-writer.util';
import type {
  SpreadsheetColumnDef,
  SpreadsheetSheetMetadata,
} from '@/common/files/file-format.types';
import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import { PrismaService } from '@/common/database/prisma.service';
import {
  GRADEBOOK_EXPORT_AVERAGE_COLUMN,
  GRADEBOOK_EXPORT_BASE_COLUMNS,
  GRADEBOOK_EXPORT_FILENAMES,
  GRADEBOOK_EXPORT_SHEET_NAME,
} from '@/modules/exports/constants/gradebook-export.constants';
import type { ExportGradebookQuery } from '@/modules/exports/schemas/gradebook-export.schema';
import { GradebookGridService } from '@/modules/gradebook-grid/gradebook-grid.service';

export interface GradebookExportFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

@Injectable()
export class GradebookExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gradebookGridService: GradebookGridService,
  ) {}

  async exportGradebook(
    schoolId: string,
    courseSectionId: string,
    query: ExportGradebookQuery,
  ): Promise<GradebookExportFile> {
    const grid = await this.gradebookGridService.getGradebookGridForCourseSection(
      schoolId,
      courseSectionId,
    );

    const studentCodes = await this.loadStudentExternalCodes(
      schoolId,
      grid.rows.map((row) => row.studentId),
    );

    const scoreColumns: SpreadsheetColumnDef[] = grid.columns.map(
      (column) => ({
        header: column.name || column.slotKey,
        key: column.slotKey,
        width: 12,
      }),
    );

    const columns = [
      ...GRADEBOOK_EXPORT_BASE_COLUMNS,
      ...scoreColumns,
      GRADEBOOK_EXPORT_AVERAGE_COLUMN,
    ];

    const rows = grid.rows.map((row) => {
      const exportRow: Record<string, string> = {
        ma_hs: studentCodes.get(row.studentId) ?? '',
        ho_ten: row.studentFullName,
        tb_hk:
          row.semesterAverage != null ? String(row.semesterAverage) : '',
      };

      for (const column of grid.columns) {
        const cell = row.cells[column.slotKey];
        if (!cell) {
          exportRow[column.slotKey] = '';
          continue;
        }

        if (cell.absent) {
          exportRow[column.slotKey] = 'Vắng';
        } else if (cell.score != null) {
          exportRow[column.slotKey] = String(cell.score);
        } else {
          exportRow[column.slotKey] = '';
        }
      }

      return exportRow;
    });

    const metadata: SpreadsheetSheetMetadata = {
      title: 'SỔ ĐIỂM LỚP MÔN',
      lines: [
        {
          label: 'Lớp môn',
          value: `${grid.courseSectionCode} — ${grid.courseSectionName}`,
        },
        { label: 'Môn', value: grid.subjectName ?? grid.subjectCode ?? '—' },
        {
          label: 'Lớp HC',
          value: grid.homeroomClassCode ?? '—',
        },
        { label: 'Năm học', value: grid.academicYearName },
        { label: 'Học kỳ', value: grid.semesterName },
        {
          label: 'Trạng thái sổ',
          value: grid.isLocked ? 'Đã khóa' : 'Đang nhập',
        },
        { label: 'Số học sinh', value: String(rows.length) },
        {
          label: 'Ngày xuất',
          value: new Date().toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
          }),
        },
      ],
    };

    const buffer =
      query.format === 'csv'
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
              GRADEBOOK_EXPORT_SHEET_NAME,
              columns,
              rows,
              metadata,
            )
            .toBuffer();

    return {
      buffer,
      contentType:
        query.format === 'csv' ? getCsvContentType() : getXlsxContentType(),
      filename: GRADEBOOK_EXPORT_FILENAMES[query.format],
    };
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
}
