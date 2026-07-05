const { execSync } = require('child_process');


function parsePostgresUrl(raw, envName) {
  if (!raw) {
    throw new Error(`${envName} não definida no .env`);
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${envName} inválida`);
  }

  const protocol = url.protocol.replace(':', '');
  if (protocol !== 'postgres' && protocol !== 'postgresql') {
    throw new Error(`${envName} deve usar postgres:// ou postgresql://`);
  }

  const database = url.pathname.replace(/^\//, '').split('?')[0];
  if (!database) {
    throw new Error(`${envName} sem nome da base de dados`);
  }

  return {
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    host: url.hostname,
    port: url.port || '5432',
    database,
  };
}

const backendDb = parsePostgresUrl(process.env.DATABASE_URL, 'DATABASE_URL');
const evolutionDb = parsePostgresUrl(process.env.DATABASE_CONNECTION_URI, 'DATABASE_CONNECTION_URI');

process.env.PGPASSWORD = backendDb.password;

const psqlAdmin = `psql -U ${backendDb.user} -h ${backendDb.host} -p ${backendDb.port} -d postgres`;

function exists(db) {
  const result = execSync(`${psqlAdmin} -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'"`)
    .toString()
    .trim();

  return result === '1';
}

function create(db) {
  if (exists(db)) {
    console.log(`♻️ recriando ${db}`);

    execSync(
      `${psqlAdmin} -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db}';"`,
    );
    execSync(`${psqlAdmin} -c "DROP DATABASE ${db}"`, { stdio: 'inherit' });
  } else {
    console.log(`➕ criando ${db}`);
  }

  execSync(`${psqlAdmin} -c "CREATE DATABASE ${db}"`, { stdio: 'inherit' });
}

[backendDb.database, evolutionDb.database].forEach(create);
