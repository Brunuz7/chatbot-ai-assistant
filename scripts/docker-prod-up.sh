#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "Erro: .env não encontrado."
  echo "Copie .env.production.example para .env e preencha os valores."
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

if [ -z "${POSTGRES_PASSWORD:-}" ] || [ "$POSTGRES_PASSWORD" = "change-me" ]; then
  echo "Erro: defina POSTGRES_PASSWORD forte no .env (não use 'change-me')."
  exit 1
fi

# Volume EXTERNO — sobrevive a docker compose down / down -v / rm do projeto
if ! docker volume inspect prestei_postgres_data >/dev/null 2>&1; then
  echo "Criando volume persistente prestei_postgres_data..."
  docker volume create prestei_postgres_data \
    --label prestei.protected=true \
    --label prestei.description="PostgreSQL Prestei — NÃO REMOVER"
  echo "Volume criado. Seus dados ficam aqui permanentemente."
else
  echo "Volume prestei_postgres_data já existe — dados preservados."
fi

echo ""
echo "Subindo stack de produção..."
docker compose -f docker-compose.prod.yml up -d --build "$@"

echo ""
echo "======================================"
echo "Produção no ar"
echo "======================================"
echo "Frontend:  https://prestei.com"
echo "Backend:   https://api.prestei.com"
echo "Evolution: https://evolution.prestei.com"
echo ""
echo "Banco: volume prestei_postgres_data (externo, protegido)"
echo "Parar:  bash scripts/docker-prod-down.sh"
echo "NUNCA:  docker compose down -v  (mesmo assim o volume externo sobrevive)"
