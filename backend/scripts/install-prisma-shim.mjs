#!/usr/bin/env node
/**
 * Substitui o symlink `node_modules/.bin/prisma` por um script que usa prisma-shim.mjs.
 * Não cria `.env` em backend/ — lê o da raiz do monorepo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const binPath = path.join(backendDir, 'node_modules', '.bin', 'prisma');
const shimPath = path.join(backendDir, 'scripts', 'prisma-shim.mjs');

if (!fs.existsSync(path.join(backendDir, 'node_modules', 'prisma'))) {
  process.exit(0);
}

const shim = `#!/usr/bin/env sh
exec node "${shimPath.replace(/"/g, '\\"')}" "$@"
`;

try {
  const stat = fs.lstatSync(binPath);
  if (stat.isSymbolicLink()) {
    fs.unlinkSync(binPath);
  }
} catch {
  /* bin ainda não existe */
}

fs.writeFileSync(binPath, shim, { mode: 0o755 });
