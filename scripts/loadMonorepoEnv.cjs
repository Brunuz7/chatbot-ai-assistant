'use strict';

const fs = require('fs');
const { resolveMonorepoEnvPath } = require('./lib/monorepoEnvPath.cjs');

function loadMonorepoEnv() {
  const envPath = resolveMonorepoEnvPath();

  if (!fs.existsSync(envPath)) {
    throw new Error(`.env não encontrado em ${envPath}`);
  }

  const env = fs.readFileSync(envPath, 'utf-8');

  env.split('\n').forEach((line) => {
    if (!line || line.startsWith('#')) return;

    const eq = line.indexOf('=');
    if (eq === -1) return;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  });

  return envPath;
}

module.exports = { loadMonorepoEnv };
