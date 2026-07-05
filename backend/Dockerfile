FROM node:24-bookworm

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install && npx prisma generate

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]