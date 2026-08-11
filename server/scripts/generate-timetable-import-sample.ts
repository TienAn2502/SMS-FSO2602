import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { TIMETABLE_IMPORT_TEMPLATE_FILENAME } from '@/modules/imports/constants/timetable-import.constants';
import { TimetableImportTemplateService } from '@/modules/imports/timetable-import-template.service';

async function main() {
  const service = new TimetableImportTemplateService({} as never);
  const buffer = await service.buildSampleFileBuffer();
  const outputPath = resolve(
    process.cwd(),
    `../docs/samples/${TIMETABLE_IMPORT_TEMPLATE_FILENAME}`,
  );

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);

  console.log(`Created sample file: ${outputPath}`);
}

void main();
