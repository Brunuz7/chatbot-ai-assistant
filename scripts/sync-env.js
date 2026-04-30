import fs from 'fs';
import path from 'path';

const rootEnv = path.resolve('.env');
const destinations = [path.resolve('backend/.env'), path.resolve('api-evolution/.env')];

destinations.forEach(dest => {
  try {
    if (fs.existsSync(rootEnv)) {
      fs.copyFileSync(rootEnv, dest);
      console.log(`✅ .env copiado para: ${dest}`);
    } else {
      console.warn(`⚠️ Arquivo .env não encontrado na raiz: ${rootEnv}`);
    }
  } catch (err) {
    console.error(`❌ Erro ao copiar para ${dest}:`, err.message);
  }
});