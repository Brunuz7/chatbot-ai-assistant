#!/usr/bin/env node
/** Atalho: mesmo comportamento que \`npx prisma\` após postinstall. */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const shim = join(dirname(fileURLToPath(import.meta.url)), 'prisma-shim.mjs');
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Uso: npm run prisma -- <comando>  (ex.: migrate dev, generate)');
  process.exit(1);
}

const r = spawnSync(process.execPath, [shim, ...args], { stdio: 'inherit' });
process.exit(r.status ?? 1);
