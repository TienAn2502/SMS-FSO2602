import { Injectable } from '@nestjs/common';

import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import {
  PARENT_IMPORT_COLUMNS,
  PARENT_IMPORT_INSTRUCTION_LINES,
  PARENT_IMPORT_SAMPLE_ROWS,
  PARENT_IMPORT_SHEET_NAME,
} from '@/modules/imports/constants/parents-import.constants';

@Injectable()
export class ParentsImportTemplateService {
  async buildTemplateBuffer(): Promise<Buffer> {
    return this.buildSampleFileBuffer();
  }

  async buildSampleFileBuffer(): Promise<Buffer> {
    const builder = new WorkbookBuilder();
    builder.addSheetFromRows(
      PARENT_IMPORT_SHEET_NAME,
      PARENT_IMPORT_COLUMNS,
      PARENT_IMPORT_SAMPLE_ROWS,
    );
    builder.addInstructionSheet('Huong_dan', PARENT_IMPORT_INSTRUCTION_LINES);
    return builder.toBuffer();
  }
}
