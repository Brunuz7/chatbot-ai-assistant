---
name: revisao-codigo
description: >-
  Revisa código (frontend React, backend Express)
  seguindo padrões do projeto: estilo compacto, TypeScript, segurança e arquitetura.
  Use ao revisar PRs, diffs, commits ou quando o usuário pedir revisão de código.
---

# Revisão de Código

## Quando usar

- Revisão de pull request ou diff
- Pedido explícito de "revisar código", "code review" ou "está ok?"
- Antes de merge em alterações sensíveis (auth, webhooks, fluxos, WhatsApp)

## Fluxo

1. Entender o **objetivo** da mudança (bugfix, feature, refactor)
2. Ler o diff completo — não só o último commit
3. Verificar **correção**, **segurança**, **estilo** e **testes/build**
4. Priorizar feedback: crítico → sugestão → opcional
5. Responder em **português (PT-BR)**

## Checklist por camada

### Frontend (`frontend/`)

- [ ] TypeScript sem erros (`npm run typecheck`)
- [ ] ESLint/Prettier ok (`npm run lint`)
- [ ] Componentes React: hooks corretos, sem dependências faltando
- [ ] UX: estados loading/erro/vazio; mensagens em PT-BR para o utilizador
- [ ] API: erros tratados via `getApiErrorMessage` quando ap3

### Backend (`backend/`)

- [ ] Rotas protegidas com auth onde necessário
- [ ] Validação de input antes de persistir ou chamar serviços externos
- [ ] Prisma: queries com escopo correto (tenant/user)
- [ ] Sem secrets hardcoded; usar `.env`
- [ ] TypeScript + ESLint ok

## Padrão de estilo (obrigatório na revisão)

Consultar [STANDARDS.md](STANDARDS.md). Resumo:

- **Linhas compactas**: preferir `if (x) return;` numa linha; não forçar quebra em tudo
- **printWidth 120**; `singleAttributePerLine: false`
- **Early return** em vez de aninhamento profundo
- **Imports** ordenados e sem duplicados
- **Nomenclatura**: camelCase (vars/funções), PascalCase (componentes/classes), kebab-case (ficheiros backend/evolution)

## Formato da resposta

```markdown
## Resumo
[1–2 frases sobre a mudança e veredicto geral]

## Crítico (corrigir antes de merge)
- ...

## Sugestões
- ...

## Opcional
- ...

## Verificação
- [ ] typecheck
- [ ] lint
- [ ] build (se ap\|3)
```

Use 🔴 crítico, 🟡 sugestão, 🟢 opcional apenas se ajudar a escanear; não abuse.

## O que sinalizar como crítico

- Bugs de lógica ou regressões
- Falhas de auth/autorização
- SQL/injection, XSS, exposição de tokens
- Race conditions ou perda de dados
- Quebra de contrato de API sem migração/documentação

## O que NÃO bloquear merge

- Preferências estéticas fora do padrão documentado
- Refactors não pedidos no scope do PR
- Micro-otimizações sem impacto medido

## Comandos úteis

```bash
# Raiz do monorepo
npm run typecheck
npm run lint
npm run lint:fix

# Por pacote
npm --prefix frontend run lint
npm --prefix backend run lint
npm --prefix api-evolution run lint:check
```

## Recursos

- Padrões detalhados: [STANDARDS.md](STANDARDS.md)
- Conceito do produto: `.docs/product/concept.md`
- Evolution API: `api-evolution/AGENTS.md` e `api-evolution/.cursor/rules/`
