# Padrões de código — chatbot-ai-assistant

## Filosofia

Código legível e **compacto**. Evitar quebras de linha desnecessárias. O formatter não deve "explodir" expressões simples em várias linhas.

## Prettier (`.prettierrc.js` na raiz)

| Opção | Valor | Motivo |
|-------|-------|--------|
| `printWidth` | 120 | Linhas mais longas antes de quebrar |
| `singleAttributePerLine` | false | JSX/props não forçados um por linha |
| `bracketSameLine` | true | `>` de JSX na mesma linha da tag |
| `singleQuote` | true | Aspas simples |
| `trailingComma` | all | Diffs mais limpos em multilinha real |

## ESLint (`eslint.shared.mjs`)

| Regra | Efeito |
|-------|--------|
| `curly: multi-or-nest` | `if (x) return;` sem chaves numa linha |
| `brace-style: 1tbs + allowSingleLine` | chaves compactas quando couber |
| `max-len: 120` (warn) | aviso, não erro rígido |

## Exemplos preferidos

```typescript
// ✅ Early return compacto
if (!user) return res.status(401).json({ error: 'Unauthorized' });
if (loading) return null;

// ✅ Guard clauses encadeadas
if (status === 'completed') return 'success';
if (status === 'running') return 'info';
return 'default';

// ✅ Ternário curto
const label = active ? 'Ativo' : 'Inativo';

// ❌ Evitar (salvo linha > 120 chars ou lógica complexa)
if (!user) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

## TypeScript

- Tipos explícitos em APIs públicas e DTOs
- Evitar `any`; usar `unknown` + narrowing quando necessário
- Frontend: `strict` progressivo; corrigir erros de `typecheck` antes de merge

## Estrutura do monorepo

| Pacote | Stack | Lint |
|--------|-------|------|
| `frontend/` | React 19 + Vite + Tailwind | `eslint.config.js` |
| `backend/` | Express 5 + Prisma | `eslint.config.js` |
| `api-evolution/` | Evolution API fork | `.eslintrc.js` (legado) |

## Commits

Conventional Commits quando aplicável: `feat(scope): descrição`

## Idioma

- Código e comentários técnicos: **inglês**
- UI e mensagens ao utilizador: **português (PT-BR)**
- Revisões e comunicação com o time: **português (PT-BR)**
