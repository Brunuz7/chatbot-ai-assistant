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
npx prisma generate

echo ""
echo "Prisma migrate deploy..."
npx prisma migrate deploy

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