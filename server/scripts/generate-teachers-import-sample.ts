import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { TeachersImportTemplateService } from '@/modules/imports/teachers-import-template.service';

async function main() {
  const service = new TeachersImportTemplateService();
  const buffer = await service.buildSampleFileBuffer();
  const outputPath = resolve(
    process.cwd(),
    '../docs/samples/teachers-import-sample.xlsx',
  );

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);

  console.log(`Created sample file: ${outputPath}`);
}

void main();
