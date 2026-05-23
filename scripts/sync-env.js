import fs from 'fs';
import path from 'path';

const rootEnv = path.resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnv)) {
  console.log(
    '✅ Monorepo: `.env` na raiz (backend usa prisma-shim / loadRootEnv; sem cópias para subpastas).',
  );
} else {
  console.warn(
    `⚠️  Cria o ficheiro ${rootEnv} (por exemplo a partir de .env.example na raiz).`,
  );
}
