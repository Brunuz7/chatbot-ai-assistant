# Painel com Autenticação Forte (frontend + backend)

Rascunho de um painel mínimo com autenticação baseada em JWT (access token curto) e refresh token via cookie HttpOnly.

Back-end (app/backend):
- Endpoints: /api/auth/register, /api/auth/login, /api/auth/refresh, /api/auth/logout, /api/auth/protected
- Usa bcrypt para hash de senha, JWT para tokens, cookie HttpOnly para refresh tokens, rate limiter simples, lockout após 5 tentativas.

Front-end (app/frontend):
- Páginas: /login, /register, /dashboard
- Usa axios comCredentials para enviar/receber cookies; dashboard consome /api/auth/protected

Como rodar (local):
1. Backend:
   - cd app/backend
   - npm install
   - npm run dev

2. Frontend:
   - cd app/frontend
   - npm install
   - npm run dev

Notas:
- Em produção, defina as variáveis de ambiente ACCESS_TOKEN_SECRET e REFRESH_TOKEN_SECRET.
- O armazenamento de usuários é in-memory (arquivo `authStore.ts`) — substitua por um banco de dados para uso real.
