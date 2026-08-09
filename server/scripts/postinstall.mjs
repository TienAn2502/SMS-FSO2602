import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function findExistingQueryEngine() {
  const pnpmDir = join(root, 'node_modules/.pnpm');
  if (!existsSync(pnpmDir)) {
    return null;
  }

  for (const entry of readdirSync(pnpmDir)) {
    if (!entry.startsWith('@prisma+client@')) {
      continue;
    }

    const enginePath = join(
      pnpmDir,
      entry,
      'node_modules/.prisma/client/query_engine-windows.dll.node',
    );

    if (existsSync(enginePath)) {
      return enginePath;
    }
  }

  return null;
}

function runGenerate() {
  const prismaCli = join(root, 'node_modules/prisma/build/index.js');
  const command = existsSync(prismaCli) ? process.execPath : 'npx';
  const args = existsSync(prismaCli)
    ? [prismaCli, 'generate']
    : ['prisma', 'generate'];

  return spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
  });
}

async function main() {
  if (findExistingQueryEngine() && process.env.PRISMA_FORCE_GENERATE !== '1') {
    console.log(
      '[postinstall] Prisma client already exists — skipping generate (set PRISMA_FORCE_GENERATE=1 to override)',
    );
    return;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = runGenerate();

    if (result.status === 0) {
      return;
    }

    if (attempt < 3) {
      console.warn(
        `[postinstall] prisma generate failed (attempt ${attempt}/3), retrying...`,
      );
      await setTimeout(1500);
    }
  }

  if (findExistingQueryEngine()) {
    console.warn(
      '[postinstall] prisma generate skipped — query engine file is locked but an existing client was found.\n' +
        '  Stop any running Nest dev server, then run: pnpm prisma:generate',
    );
    return;
  }

  console.error(
    '[postinstall] prisma generate failed and no client was found.\n' +
      '  Run manually: pnpm prisma:generate',
  );
  process.exit(1);
}

await main();
