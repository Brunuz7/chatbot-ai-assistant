FROM node:24-bookworm

WORKDIR /app

ENV DATABASE_PROVIDER=postgresql

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install && npx prisma generate --schema ./prisma/postgresql-schema.prisma

COPY . .

EXPOSE 8080

CMD ["npm", "run", "dev:server"]