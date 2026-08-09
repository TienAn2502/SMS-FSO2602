import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { ScoresImportTemplateService } from '@/modules/imports/scores-import-template.service';

async function main() {
  const service = new ScoresImportTemplateService({} as never);
  const buffer = await service.buildSampleFileBuffer();
  const outputPath = resolve(
    process.cwd(),
    '../docs/samples/scores-import-sample.xlsx',
  );

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);

  console.log(`Created sample file: ${outputPath}`);
}

void main();
