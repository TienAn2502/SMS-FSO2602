import { Injectable } from '@nestjs/common';

import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import { PrismaService } from '@/common/database/prisma.service';
import {
  STUDENT_IMPORT_COLUMNS,
  STUDENT_IMPORT_INSTRUCTION_LINES,
  STUDENT_IMPORT_SAMPLE_ROWS,
  STUDENT_IMPORT_SHEET_NAME,
} from '@/modules/imports/constants/students-import.constants';
import type { StudentsImportTemplateQuery } from '@/modules/imports/schemas/students-import.schema';

@Injectable()
export class StudentsImportTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplateBuffer(
    schoolId: string,
    query: StudentsImportTemplateQuery,
  ): Promise<Buffer> {
    const sampleRows = await this.resolveSampleRows(schoolId, query);

    const builder = new WorkbookBuilder();
    builder.addSheetFromRows(
      STUDENT_IMPORT_SHEET_NAME,
      STUDENT_IMPORT_COLUMNS,
      sampleRows,
    );
    builder.addInstructionSheet('Huong_dan', STUDENT_IMPORT_INSTRUCTION_LINES);

    return builder.toBuffer();
  }

  async buildSampleFileBuffer(): Promise<Buffer> {
    const builder = new WorkbookBuilder();
    builder.addSheetFromRows(
      STUDENT_IMPORT_SHEET_NAME,
      STUDENT_IMPORT_COLUMNS,
      STUDENT_IMPORT_SAMPLE_ROWS,
    );
    builder.addInstructionSheet('Huong_dan', STUDENT_IMPORT_INSTRUCTION_LINES);
    return builder.toBuffer();
  }

  private async resolveSampleRows(
    schoolId: string,
    query: StudentsImportTemplateQuery,
  ): Promise<Record<string, string>[]> {
    if (!query.academicYearId) {
      return STUDENT_IMPORT_SAMPLE_ROWS;
    }

    const classes = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId,
        academicYearId: query.academicYearId,
        status: 'ACTIVE',
      },
      orderBy: { code: 'asc' },
      take: 3,
      select: { code: true },
    });

    if (classes.length === 0) {
      return STUDENT_IMPORT_SAMPLE_ROWS;
    }

    return STUDENT_IMPORT_SAMPLE_ROWS.map((row, index) => ({
      ...row,
      ma_lop_hc: classes[index % classes.length]?.code ?? row.ma_lop_hc,
    }));
  }
}
