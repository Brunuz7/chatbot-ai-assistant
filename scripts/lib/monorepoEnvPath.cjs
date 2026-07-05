const fs = require('fs');
const path = require('path');

function resolveMonorepoEnvPath() {
  const candidates = [
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return path.resolve(process.cwd(), '../.env');
}

module.exports = { resolveMonorepoEnvPath };
