#!/usr/bin/env node
/**
 * Prisma CLI com `.env` da raiz do monorepo (sem copiar nem symlink em backend/).
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const require = createRequire(import.meta.url);
const { resolveMonorepoEnvPath } = require('../../scripts/lib/monorepoEnvPath.cjs');

const envPath = resolveMonorepoEnvPath();
const loaded = dotenv.config({ path: envPath });

if (loaded.error) {
  console.error(`[prisma] Não foi possível carregar ${envPath}:`, loaded.error.message);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error(`[prisma] DATABASE_URL ausente em ${envPath}`);
  process.exit(1);
}

const backendDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const prismaEntry = join(backendDir, 'node_modules', 'prisma', 'build', 'index.js');

const result = spawnSync(process.execPath, [prismaEntry, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
  cwd: backendDir,
});

process.exit(result.status === null ? 1 : result.status);
