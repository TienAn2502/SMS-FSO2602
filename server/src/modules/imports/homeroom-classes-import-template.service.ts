import { Injectable } from '@nestjs/common';

import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import { PrismaService } from '@/common/database/prisma.service';
import {
  HOMEROOM_CLASS_IMPORT_COLUMNS,
  HOMEROOM_CLASS_IMPORT_INSTRUCTION_LINES,
  HOMEROOM_CLASS_IMPORT_SAMPLE_ROWS,
  HOMEROOM_CLASS_IMPORT_SHEET_NAME,
} from '@/modules/imports/constants/homeroom-classes-import.constants';
import type { HomeroomClassesImportTemplateQuery } from '@/modules/imports/schemas/homeroom-classes-import.schema';

@Injectable()
export class HomeroomClassesImportTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplateBuffer(
    schoolId: string,
    query: HomeroomClassesImportTemplateQuery,
  ): Promise<Buffer> {
    const sampleRows = await this.resolveSampleRows(schoolId, query);

    const builder = new WorkbookBuilder();
    builder.addSheetFromRows(
      HOMEROOM_CLASS_IMPORT_SHEET_NAME,
      HOMEROOM_CLASS_IMPORT_COLUMNS,
      sampleRows,
    );
    builder.addInstructionSheet(
      'Huong_dan',
      HOMEROOM_CLASS_IMPORT_INSTRUCTION_LINES,
    );
    return builder.toBuffer();
  }

  async buildSampleFileBuffer(): Promise<Buffer> {
    const builder = new WorkbookBuilder();
    builder.addSheetFromRows(
      HOMEROOM_CLASS_IMPORT_SHEET_NAME,
      HOMEROOM_CLASS_IMPORT_COLUMNS,
      HOMEROOM_CLASS_IMPORT_SAMPLE_ROWS,
    );
    builder.addInstructionSheet(
      'Huong_dan',
      HOMEROOM_CLASS_IMPORT_INSTRUCTION_LINES,
    );
    return builder.toBuffer();
  }

  private async resolveSampleRows(
    schoolId: string,
    query: HomeroomClassesImportTemplateQuery,
  ): Promise<Record<string, string>[]> {
    if (!query.academicYearId) {
      return HOMEROOM_CLASS_IMPORT_SAMPLE_ROWS;
    }

    const teachers = await this.prisma.teacher.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        userId: { not: null },
      },
      take: 2,
      orderBy: { fullName: 'asc' },
      select: {
        user: { select: { email: true } },
      },
    });

    const teacherEmails = teachers
      .map((teacher) => teacher.user?.email ?? '')
      .filter(Boolean);

    return HOMEROOM_CLASS_IMPORT_SAMPLE_ROWS.map((row, index) => ({
      ...row,
      email_gvcn: teacherEmails[index] ?? row.email_gvcn,
    }));
  }
}
