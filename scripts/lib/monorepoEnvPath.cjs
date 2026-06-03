'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Devolve o caminho absoluto para o único `.env` na raiz do monorepo
 * (directório que contém as pastas `backend` e `api-evolution`).
 */
function resolveMonorepoEnvPath() {
  const seeds = new Set([
    process.cwd(),
    path.resolve(__dirname, '..', '..'),
  ]);

  for (const start of seeds) {
    let dir = path.resolve(start);
    for (let i = 0; i < 16; i++) {
      const backend = path.join(dir, 'backend');
      const evolution = path.join(dir, 'api-evolution');
      if (fs.existsSync(backend) && fs.existsSync(evolution)) {
        return path.join(dir, '.env');
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  return path.resolve(process.cwd(), '..', '.env');
}

module.exports = { resolveMonorepoEnvPath };
