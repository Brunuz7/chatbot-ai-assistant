#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Parando containers (volume prestei_postgres_data preservado)..."
docker compose -f docker-compose.prod.yml down

echo "OK — banco de dados intacto no volume prestei_postgres_data."
