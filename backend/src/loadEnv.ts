/**
 * Deve ser o primeiro import de `index.ts` (ESM avalia imports antes do corpo do módulo).
 */
import { createRequire } from 'node:module';
import dotenv from 'dotenv';

const require = createRequire(import.meta.url);
const { resolveMonorepoEnvPath } = require('../../scripts/lib/monorepoEnvPath.cjs');

dotenv.config({ path: resolveMonorepoEnvPath() });
