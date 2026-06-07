#!/bin/bash

set -euo pipefail

PROJECT_PATH="/var/www/chatbot-ai-assistant"

echo "======================================"
echo "INICIANDO DEPLOY"
echo "======================================"

echo ""
echo "Atualizando código..."
cd "$PROJECT_PATH"

git fetch origin
git reset --hard origin/main

echo ""
echo "======================================"
echo "FRONTEND"
echo "======================================"

cd "$PROJECT_PATH/frontend"

npm ci
npm run build

echo ""
echo "======================================"
echo "BACKEND"
echo "======================================"

cd "$PROJECT_PATH/backend"

npm ci

echo ""
echo "Prisma generate..."
npm run db:generate

echo ""
echo "Prisma migrate deploy..."
set +e
MIGRATE_OUTPUT=$(npm run db:migrate:deploy 2>&1)
MIGRATE_EXIT=$?
set -e
echo "$MIGRATE_OUTPUT"

if [ "$MIGRATE_EXIT" -ne 0 ]; then
  if echo "$MIGRATE_OUTPUT" | grep -q "P3005"; then
    INIT_MIGRATION=$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d -name '[0-9]*_*' | sort | head -1 | xargs -r basename)

    if [ -z "$INIT_MIGRATION" ]; then
      echo "Erro: nenhuma migration encontrada para baseline."
      exit 1
    fi

    echo ""
    echo "Banco já possui schema sem histórico Prisma (P3005)."
    echo "Registrando baseline da migration inicial: $INIT_MIGRATION"
    npm run prisma -- migrate resolve --applied "$INIT_MIGRATION"

    echo ""
    echo "Reexecutando migrate deploy..."
    npm run db:migrate:deploy
  else
    exit "$MIGRATE_EXIT"
  fi
fi

echo ""
echo "Build backend..."
npm run build

echo ""
echo "======================================"
echo "REINICIANDO PM2"
echo "======================================"

pm2 reload chatbot

echo ""
echo "======================================"
echo "DEPLOY FINALIZADO"
echo "======================================"