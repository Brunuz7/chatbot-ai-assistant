const { execSync } = require('child_process');
const fs = require('fs');

if (fs.existsSync('.env')) {
  const env = fs.readFileSync('.env', 'utf-8');

  env.split('\n').forEach(line => {
    if (!line || line.startsWith('#')) return;

    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();

    process.env[key.trim()] = value;
  });
}

const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_NAME2 = process.env.DB_NAME2;

process.env.PGPASSWORD = DB_PASSWORD;

function exists(db) {
  const result = execSync(`psql -U ${DB_USER} -h 127.0.0.1 -p 5432 -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'"`
  )
    .toString()
    .trim();

  return result === '1';
}

function create(db) {
  if (exists(db)) {
    console.log(`♻️ recriando ${db}`);

    execSync(`psql -U ${DB_USER} -h 127.0.0.1 -p 5432 -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db}';"`);
    execSync(`psql -U ${DB_USER} -h 127.0.0.1 -p 5432 -d postgres -c "DROP DATABASE ${db}"`, { stdio: 'inherit' });
  } else {
    console.log(`➕ criando ${db}`);
  }

  execSync(`psql -U ${DB_USER} -h 127.0.0.1 -p 5432 -d postgres -c "CREATE DATABASE ${db}"`, { stdio: 'inherit' });
}

[DB_NAME, DB_NAME2].forEach(create);