import { Injectable } from '@nestjs/common';

import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import {
  TEACHER_IMPORT_COLUMNS,
  TEACHER_IMPORT_INSTRUCTION_LINES,
  TEACHER_IMPORT_SAMPLE_ROWS,
  TEACHER_IMPORT_SHEET_NAME,
} from '@/modules/imports/constants/teachers-import.constants';

@Injectable()
export class TeachersImportTemplateService {
  async buildTemplateBuffer(): Promise<Buffer> {
    return this.buildSampleFileBuffer();
  }

  async buildSampleFileBuffer(): Promise<Buffer> {
    const builder = new WorkbookBuilder();
    builder.addSheetFromRows(
      TEACHER_IMPORT_SHEET_NAME,
      TEACHER_IMPORT_COLUMNS,
      TEACHER_IMPORT_SAMPLE_ROWS,
    );
    builder.addInstructionSheet('Huong_dan', TEACHER_IMPORT_INSTRUCTION_LINES);
    return builder.toBuffer();
  }
}
