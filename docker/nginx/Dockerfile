# Build do frontend + nginx gateway (SSL montado em runtime)
FROM node:24-bookworm AS frontend-build

WORKDIR /repo

COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend

COPY frontend ./frontend
COPY backend/src/config/plans.ts ./backend/src/config/plans.ts

WORKDIR /repo/frontend

ARG VITE_API_URL
ARG VITE_APP_URL
ARG VITE_META_APP_ID
ARG VITE_META_EMBEDDED_CONFIG_ID
ARG VITE_META_EMBEDDED_REDIRECT_URI
ARG VITE_WHATSAPP_EVOLUTION_CHANNEL_ENABLED

ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_URL=$VITE_APP_URL \
    VITE_META_APP_ID=$VITE_META_APP_ID \
    VITE_META_EMBEDDED_CONFIG_ID=$VITE_META_EMBEDDED_CONFIG_ID \
    VITE_META_EMBEDDED_REDIRECT_URI=$VITE_META_EMBEDDED_REDIRECT_URI \
    VITE_WHATSAPP_EVOLUTION_CHANNEL_ENABLED=$VITE_WHATSAPP_EVOLUTION_CHANNEL_ENABLED

RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache curl

COPY docker/nginx/prod.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /repo/frontend/dist /usr/share/nginx/html

EXPOSE 80 443 8088

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8088/nginx-health || exit 1
