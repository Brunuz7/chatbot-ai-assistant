#!/usr/bin/env node
'use strict';

/**
 * Destrutivo: recria os DBs, apaga o histórico de migrations e gera uma migration `init` a partir do schema atual.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const { loadMonorepoEnv } = require('./loadMonorepoEnv.cjs');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const EVOLUTION = path.join(ROOT, 'api-evolution');

function run(cmd, cwd = ROOT) {
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
}

function clearMigrations(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir)) {
    if (entry === 'migration_lock.toml') continue;
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

function syncEvolutionMigrations(provider) {
  const active = path.join(EVOLUTION, 'prisma/migrations');
  const target = path.join(EVOLUTION, 'prisma', `${provider}-migrations`);

  if (!fs.existsSync(active)) return;

  clearMigrations(target);

  for (const entry of fs.readdirSync(active)) {
    if (entry === 'migration_lock.toml') continue;
    fs.cpSync(path.join(active, entry), path.join(target, entry), { recursive: true });
  }
}

loadMonorepoEnv();

const provider = process.env.DATABASE_PROVIDER || 'postgresql';
const schema = `./prisma/${provider}-schema.prisma`;

console.log('🗑️  Recriando bases de dados (PostgreSQL)...');
run('node scripts/db-setup.js');

console.log('🗑️  Zerando migrations do backend...');
clearMigrations(path.join(BACKEND, 'prisma/migrations'));

console.log(`🗑️  Zerando migrations da api-evolution (${provider})...`);
clearMigrations(path.join(EVOLUTION, 'prisma', `${provider}-migrations`));
clearMigrations(path.join(EVOLUTION, 'prisma/migrations'));

console.log('📦 backend — migrate dev --name init');
run('npm run db:migrate -- --name init', BACKEND);

console.log('📦 api-evolution — migrate dev --name init');
run(`node runWithProvider.js "npx prisma migrate dev --name init --schema=${schema}"`, EVOLUTION);

console.log('📁 Sincronizando postgresql-migrations...');
syncEvolutionMigrations(provider);

console.log('🌱 backend — seed');
run('npm run db:seed', BACKEND);

console.log('✅ Bases zeradas com migration init. Dados anteriores foram perdidos.');
