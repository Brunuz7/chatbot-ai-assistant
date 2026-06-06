#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');

const { loadMonorepoEnv } = require('./loadMonorepoEnv.cjs');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const EVOLUTION = path.join(ROOT, 'api-evolution');

const deploy = process.argv.includes('--deploy');
const passthrough = process.argv.slice(2).filter((a) => a !== '--deploy');
const extra = passthrough.length ? ` ${passthrough.join(' ')}` : '';

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
}

function evolutionMigrateDev() {
  const provider = process.env.DATABASE_PROVIDER || 'postgresql';
  const migrationsFolder = provider === 'psql_bouncer' ? 'postgresql-migrations' : `${provider}-migrations`;
  const schema = `./prisma/${provider}-schema.prisma`;
  const prismaCmd = deploy ? 'migrate deploy' : `migrate dev${extra}`;
  const syncBack = deploy ? '' : ` && cp -r ./prisma/migrations/* ./prisma/${migrationsFolder}/`;

  run(
    `node runWithProvider.js "rm -rf ./prisma/migrations && cp -r ./prisma/${migrationsFolder} ./prisma/migrations && npx prisma ${prismaCmd} --schema=${schema}${syncBack}"`,
    EVOLUTION,
  );
}

loadMonorepoEnv();

if (deploy) {
  console.log('▶ backend — migrate deploy');
  run(`npm run db:migrate:deploy${extra ? ` -- ${extra}` : ''}`, BACKEND);

  console.log('▶ api-evolution — migrate deploy');
  evolutionMigrateDev();
} else {
  console.log('▶ backend — migrate dev');
  run(`npm run db:migrate${extra ? ` -- ${extra}` : ''}`, BACKEND);

  console.log('▶ api-evolution — migrate dev');
  evolutionMigrateDev();
}

console.log('✅ Migrations aplicadas');
