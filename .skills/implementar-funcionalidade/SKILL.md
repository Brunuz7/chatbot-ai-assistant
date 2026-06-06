---
name: implementar-funcionalidade
description: >-
  Implementa novas funcionalidades no monorepo (frontend React + backend Express)
  com código curto, lógica simples e mínimo de abstrações. Use ao criar features,
  endpoints, páginas, componentes ou quando o usuário pedir implementação nova.
---

# Implementar Funcionalidade

## Princípios

1. **Menor diff possível** — resolver só o pedido; sem refactor lateral
2. **Código curto** — inline > helper; `.map()` > mini-componente local
3. **Sem abstração prematura** — não extrair o que é usado uma vez
4. **Seguir o existente** — copiar padrão de ficheiros vizinhos antes de inventar estrutura

## Antes de codar

1. Localizar ficheiros similares (mesma entidade/domínio)
2. Ler regra de frontend: `.cursor/rules/frontend-structure.mdc`
3. Confirmar se a entidade já existe no Prisma (`backend/prisma/schema.prisma`)

## Backend

### Estrutura por entidade

| Camada | Ficheiro | Padrão |
|--------|----------|--------|
| Controller | `backend/src/controllers/<Entity>Controller.ts` | `export class XController { static async ... }` |
| Service | `backend/src/services/<Entity>Service.ts` | `export class XService { static async ... }` |
| Rotas | `backend/src/routes/appRoutes.ts` | registrar endpoints |
| Tipos compartilhados | `backend/src/types/` | só quando usados em 2+ módulos |

### Regras

- **Um ficheiro de service = exactamente uma `export class`** — nunca duas classes no mesmo ficheiro (ex.: `FlowEngineService` fica em `FlowEngineService.ts`, separado de `FlowService.ts`)
- **Nada fora da class no service** — proibido `function` solta, helpers de módulo e constantes soltas; usar `private static` / `static readonly` na class
- **Tipos partilhados** → `backend/src/types/` (ex.: `FlowWriteData`, `StoreProduct`); não definir tipos de domínio soltos no ficheiro do service
- **Constantes de domínio** → `static readonly` na class (ex.: `StoreService.category`)
- **Textos de prompt para IA** → `backend/src/constants/prompts.ts` — strings fixas, secções e builders; **nunca** inline nos services
- **Lógica de domínio** → métodos `static` / `private static` do service da entidade — **não** criar `utils/storeCatalog.ts` paralelo ao `StoreService`
- **`utils/`** só para infra transversal reutilizada (ex.: `inboundTrace`, formatação de conversa) — não para regras de negócio da loja, fluxo, etc.
- **Um service/controller por entidade** — estender o existente em vez de criar paralelo
- **Validação compacta** — `if (!x) throw new Error('invalid_input');` + mapeamento de erros no controller
- **Prisma direto no service** — sem camada repository extra

```typescript
// ✅ Preferido — um ficheiro, uma class
export class StoreService {
  static readonly category = 'loja integrada';

  static formatCatalogForPrompt(content: string) { ... }

  private static decodeCatalog(content: string) { ... }
}

// FlowEngineService.ts — motor de execução, ficheiro separado
export class FlowEngineService {
  private static readonly maxChainIterations = 64;

  static async executeInboundFlow(params: { ... }) { ... }
}

// FlowService.ts — CRUD de fluxos
export class FlowService {
  private static normalizeFlowPayload(body: Record<string, unknown>): FlowWriteData { ... }

  static async create(userId: string, raw: FlowWriteData | Record<string, unknown>) {
    const data = FlowService.normalizeFlowPayload(raw as Record<string, unknown>);
    ...
  }
}

// ❌ Evitar — helper e constante fora da class
const STORE_CATEGORY = 'loja integrada';
function decodeStoreCatalog(content: string) { ... }

// ❌ Evitar — prompt inline no service
const systemPrompt = 'Você é um roteador de fluxos...';

// ✅ Prompts centralizados
import { flowRouterSystem, buildFlowRouterUserMessage } from '../constants/prompts.js';
const systemPrompt = flowRouterSystem;
const userText = buildFlowRouterUserMessage(incomingText, flows);
```

## Frontend

### Estrutura

| O quê | Onde |
|-------|------|
| Página | `frontend/src/pages/<Name>.tsx` — um `export default` |
| UI de domínio | `frontend/src/components/<domínio>/` |
| Primitivos | `frontend/src/components/ui/` |
| Formatação pura reutilizável | `frontend/src/utils/` — só lógica (datas, números, parsing) |
| Constantes de opções | topo do ficheiro da página ou inline no componente que usa |

### `frontend/src/config/` — não criar

Meta da app (título, OG) já está em `index.html`. Build (`site.webmanifest`, `__APP_BASE_URL__`) fica em `vite.config.ts`. Integrações de UI (ex.: popup Meta WhatsApp) ficam no componente que usa.

| Anti-padrão | Onde fica |
|-------------|-----------|
| `config/appMeta*.ts` | strings literais no JSX; build em `vite.config.ts` |
| `config/metaWhatsApp.ts` | lógica inline em `WhatsAppConnectionPanel.tsx` |

### `frontend/src/lib/` — não criar (removido)

| Ficheiro legado | Problema | O que fazer |
|-----------------|----------|-------------|
| `floatingActionLayout.ts` | exporta strings Tailwind (`FLOATING_ACTION_END_SPACER`) | classes inline no JSX do componente |
| `typography.ts` | agrupa classes Tailwind (`type.body`, `pageIconContainerClass`) | Tailwind direto no elemento |
| `initialAppLoad.ts` | flag + 2 funções triviais num módulo separado | estado/ref inline onde é usado |
| `theme.ts` | helpers de tema | lógica no `ThemeContext` ou no componente que consome |
| `flowForm.ts` | mapeamento form ↔ API | inline na página/componente do fluxo |

**Regra:** se o ficheiro só exporta constantes de className, tipos de props, IDs de form ou helpers usados num sítio → **fica no `.tsx` que usa**, não num módulo `lib/` ou `constants/`.

### `frontend/src/constants/` — evitar ficheiros de configuração UI

Não extrair para `constants/` listas de tabs, IDs de formulário ou opções usadas num único ecrã.

| Anti-padrão | Onde fica |
|-------------|-----------|
| `constants/settingsTabs.ts` | array de tabs inline em `SettingsTabs.tsx` |
| `constants/settingsForms.ts` | `settingsAccountFormId` em `SettingsAccountSection.tsx` |

`constants/` só para dados partilhados entre vários módulos sem relação com UI (ex.: segmentos de empresa).

### Tailwind (obrigatório)

- **Sempre Tailwind** — classes utilitárias no JSX
- **Usar tokens do tema** — `bg-surface`, `text-foreground`, `border-border`, `text-primary`, `bg-primary-a10`, etc. (definidos em `tailwind.config.js` / `index.css`)
- **Nunca** criar classes CSS em `.css`, `.module.css` ou `@layer components`
- **Nunca** usar cores hardcoded (`#2563eb`, `bg-blue-500`) se existir token equivalente
- **Nunca** usar `var(--color-*)` direto no className — usar o token Tailwind

```tsx
// ✅
<div className="rounded-xl border border-border bg-surface p-4 text-foreground">

// ❌
<div className="my-card">
<div style={{ color: 'var(--color-foreground)' }}>
```

### Componentes

- **Tipos de props inline** no mesmo ficheiro — `type XProps = { ... }` acima do componente
- **Não criar** ficheiro `types/` ou `*.types.ts` só para props de um componente
- **Um export principal** por ficheiro; evitar várias `function` auxiliares no topo
- **Sem helpers locais** — preferir ternário, optional chaining, `.map()` com dados inline
- **Handlers longos** ficam dentro do componente da página, não extraídos para ficheiro separado

```tsx
// ✅ Props inline
type ContactRowProps = { name: string; onEdit: () => void };

export function ContactRow({ name, onEdit }: ContactRowProps) {
  return <button onClick={onEdit} className="text-foreground-muted hover:text-foreground">{name}</button>;
}

// ❌ types/contactRow.ts só para props
// ❌ function formatContactName() { ... } usada uma vez
```

### Quando extrair componente

Extrair **só** se:
- bloco JSX grande (> ~40 linhas) **e** reutilizado, ou
- já existe pasta do domínio com padrão similar

Não extrair badge/célula usada num único sítio.

## Estilo de código

Consultar [.skills/revisao-codigo/STANDARDS.md](../revisao-codigo/STANDARDS.md). Resumo:

- Early return numa linha: `if (!user) return res.status(401).json({ error: 'Unauthorized' });`
- `printWidth` 120; não quebrar linhas desnecessariamente
- Código e comentários técnicos em **inglês**; UI e mensagens ao utilizador em **PT-BR**

## Checklist antes de entregar

```
- [ ] Diff mínimo — sem ficheiros/métodos mortos
- [ ] Nenhuma `function` nem `const` de domínio fora da class (backend services)
- [ ] Nenhum prompt de IA inline — usar `constants/prompts.ts`
- [ ] Frontend só Tailwind + tokens do tema (classes inline, não em `lib/`)
- [ ] Nenhum ficheiro novo em `frontend/src/lib/`
- [ ] Props tipadas inline no componente
- [ ] npm run typecheck && npm run lint (pacote afetado)
```

## Anti-padrões

| Evitar | Fazer em vez disso |
|--------|-------------------|
| `lib/typography.ts`, `lib/floatingActionLayout.ts` | Tailwind inline no componente |
| `lib/initialAppLoad.ts` — flag num módulo | `useRef` / estado na página ou context |
| Qualquer ficheiro novo em `frontend/src/config/` | `index.html`, `vite.config.ts` ou componente consumidor |
| `utils/formatX.ts` com 3 linhas, 1 uso | inline no componente/service |
| `hooks/useFeature.ts` sem reutilização | estado + handler na página |
| Novo service genérico `DataService` | método no service da entidade |
| `utils/<domínio>.ts` com lógica de negócio | `private static` no `<Domínio>Service` |
| Constantes exportadas soltas no módulo | `static readonly` na class |
| Prompts de IA inline nos services | `constants/prompts.ts` |
| `function` helper fora da class (backend) | `private static` na class |
| CSS class customizada | classes Tailwind do tema |
| `interface Props` em ficheiro separado | `type Props` no `.tsx` |
| Over-engineering (factory, builder, strategy) | if/return direto |
