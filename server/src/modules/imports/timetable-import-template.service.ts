import { Injectable } from '@nestjs/common';

import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import {
  allocateExcelSheetName,
  buildTimetableMatrix,
  formatHomeroomClassLabel,
  formatTimetableImportCell,
  type TimetableMatrixEntry,
} from '@/common/utils/timetable-matrix.util';
import {
  TIMETABLE_IMPORT_INSTRUCTION_LINES,
  TIMETABLE_IMPORT_INSTRUCTION_SHEET_NAME,
  TIMETABLE_IMPORT_SAMPLE_CLASSES,
} from '@/modules/imports/constants/timetable-import.constants';

@Injectable()
export class TimetableImportTemplateService {
  async buildSampleFileBuffer(): Promise<Buffer> {
    const builder = new WorkbookBuilder();
    const usedSheetNames = new Set<string>();

    for (const sampleClass of TIMETABLE_IMPORT_SAMPLE_CLASSES) {
      const matrixEntries: TimetableMatrixEntry[] = sampleClass.entries.map(
        (entry) => ({
          dayOfWeek: entry.dayOfWeek,
          periodNumber: entry.periodNumber,
          courseSectionCode: entry.courseSectionCode,
          courseSectionName: entry.courseSectionCode,
          teacherFullName: entry.teacherEmail,
          room: entry.room,
        }),
      );

      const matrix = buildTimetableMatrix(matrixEntries, (entry) =>
        formatTimetableImportCell(
          entry.courseSectionCode,
          entry.teacherFullName,
          entry.room,
        ),
      );

      builder.addSheetFromRowsWithMetadata(
        allocateExcelSheetName(sampleClass.code, usedSheetNames),
        matrix.columns,
        matrix.rows,
        {
          title: 'THỜI KHÓA BIỂU',
          lines: [
            {
              label: 'Lớp HC',
              value: formatHomeroomClassLabel(
                sampleClass.code,
                sampleClass.name,
              ),
            },
            { label: 'Năm học', value: sampleClass.academicYearName },
            { label: 'Học kỳ', value: sampleClass.semesterName },
            {
              label: 'Số tiết',
              value: String(sampleClass.entries.length),
            },
          ],
        },
      );
    }

    builder.addInstructionSheet(
      TIMETABLE_IMPORT_INSTRUCTION_SHEET_NAME,
      TIMETABLE_IMPORT_INSTRUCTION_LINES,
    );

    return builder.toBuffer();
  }
}
