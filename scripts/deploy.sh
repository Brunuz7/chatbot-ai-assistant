#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "======================================"
echo "DEPLOY PRODUÇÃO (Docker)"
echo "======================================"

if [ -d .git ]; then
  echo "Atualizando código..."
  git fetch origin
  git reset --hard origin/main
fi

bash "$ROOT/scripts/docker-prod-up.sh" --build

echo ""
echo "Deploy concluído."
