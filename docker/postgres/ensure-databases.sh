#!/bin/bash
set -euo pipefail

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-1234}"
export PGPASSWORD="$POSTGRES_PASSWORD"

until pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" >/dev/null 2>&1; do
  echo "Aguardando PostgreSQL..."
  sleep 1
done

for db in prestei_chatbot_db evolution_db; do
  exists="$(psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'")"
  if [ "$exists" != "1" ]; then
    echo "Criando banco ${db}..."
    psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"${db}\";"
  else
    echo "Banco ${db} já existe."
  fi
done

echo "Bancos garantidos."
