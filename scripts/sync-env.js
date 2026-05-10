import fs from 'fs';
import path from 'path';

const rootEnv = path.resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnv)) {
  console.log(
    '✅ Monorepo: existe apenas `.env` na raiz; não copies para backend/, frontend/ nem api-evolution/.',
  );
} else {
  console.warn(
    `⚠️  Cria o ficheiro ${rootEnv} (por exemplo a partir de .env.example na raiz).`,
  );
}
