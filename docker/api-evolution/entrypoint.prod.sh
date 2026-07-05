#!/bin/sh
set -e

rm -rf ./prisma/migrations
cp -r ./prisma/postgresql-migrations ./prisma/migrations

npx prisma generate --schema ./prisma/postgresql-schema.prisma
npx prisma migrate deploy --schema ./prisma/postgresql-schema.prisma

exec "$@"
