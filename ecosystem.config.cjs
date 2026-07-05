const path = require('path');

const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: path.join(root, 'backend'),
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'api-evolution',
      cwd: path.join(root, 'api-evolution'),
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'PROD',
        DOCKER_ENV: 'false',
        DATABASE_PROVIDER: 'postgresql',
      },
    },
  ],
};
