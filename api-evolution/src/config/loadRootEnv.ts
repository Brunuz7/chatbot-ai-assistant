import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

function resolveMonorepoEnvPath(): string {
  for (const start of [process.cwd(), __dirname]) {
    let dir = path.resolve(start);
    for (let i = 0; i < 16; i++) {
      const backend = path.join(dir, 'backend');
      const evolution = path.join(dir, 'api-evolution');
      if (existsSync(backend) && existsSync(evolution)) {
        return path.join(dir, '.env');
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return path.resolve(process.cwd(), '..', '.env');
}

dotenv.config({ path: resolveMonorepoEnvPath() });
