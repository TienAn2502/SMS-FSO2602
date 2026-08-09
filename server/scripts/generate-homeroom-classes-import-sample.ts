import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { HomeroomClassesImportTemplateService } from '@/modules/imports/homeroom-classes-import-template.service';

async function main() {
  const service = new HomeroomClassesImportTemplateService({} as never);
  const buffer = await service.buildSampleFileBuffer();
  const outputPath = resolve(
    process.cwd(),
    '../docs/samples/homeroom-classes-import-sample.xlsx',
  );

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);

  console.log(`Created sample file: ${outputPath}`);
}

void main();
