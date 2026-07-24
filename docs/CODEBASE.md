# Guia da Base de Código — training-manager (Fit.ai)

Monorepo npm workspaces com dois pacotes: **backend** (API Fastify + Prisma) e **web** (Next.js). O produto é o **Fit.ai** — app de treino com planos personalizados, acompanhamento de consistência/streak e um **Coach IA** (provedor de LLM configurável: Ollama no dev, Gemini em produção) que cria planos e coleta perfil do usuário.

## Estrutura do repositório

```
training-manager/
├── package.json              # workspaces: packages/*
├── AGENTS.md                 # convenções e instruções para agentes
├── docs/CODEBASE.md          # este arquivo
├── packages/
│   ├── backend/              # API REST + auth + IA
│   └── web/                  # App Next.js
```

## Pontos de entrada

### Backend — `packages/backend/src/index.ts`

Bootstrap do servidor Fastify:

1. Monta o app (`buildApp`)
2. Registra error handler, Swagger/OpenAPI e docs Scalar em `/docs`
3. Configura CORS
4. Monta rotas em `/api/*`
5. Expõe auth em `/api/auth/*` via **better-auth**
6. Sobe em `localhost:3333` (configurável via `PORT`)

### Web — Next.js App Router

| Rota | Arquivo | Função |
|------|---------|--------|
| `/` | `packages/web/src/app/(home)/page.tsx` | Home: consistência, streak, treino do dia |
| `/workout-plan` | `packages/web/src/app/(main)/workout-plan/page.tsx` | Plano de treino ativo: os 7 dias da semana (segunda a domingo) |
| `/workout-plans/[workoutPlanId]/days/[workoutDayId]` | `packages/web/src/app/(main)/workout-plans/.../page.tsx` | Detalhe do dia: exercícios e sessão. O título do header vem da origem (`?from=home` → "Treino de Hoje"; sem marcador → rótulo do dia) |
| `/login` | `packages/web/src/app/(auth)/login/page.tsx` | Login com Google |
| `/onboarding` | `packages/web/src/app/onboarding/page.tsx` | Fluxo inicial com chat (WIP) |

- Layout global: `packages/web/src/app/layout.tsx` — inclui `<Chat />` (Coach IA overlay) em todas as páginas.
- Proteção de rotas: `packages/web/src/proxy.ts` (substituto do `middleware.ts` no Next.js 16) — redireciona para `/login` se não houver cookie de sessão (`training-manager` prefix).

## Arquitetura do backend

Padrão em camadas:

```
routes/          → HTTP handlers, validação Zod, auth
  ↓
use-cases/       → regra de negócio (classes com execute())
  ↓
lib/db.ts        → Prisma (acesso ao banco)
schemas/ + dtos/ → contratos OpenAPI / request-response
```

### Rotas da API (`/api/...`)

Registradas em `packages/backend/src/routes/index.ts`:

| Prefixo | Arquivo | Responsabilidade |
|---------|---------|------------------|
| `/home` | `home.routes.ts` | Dados da home (plano ativo, consistência, streak) |
| `/me` | `me.routes.ts` | Perfil do usuário (peso, altura, idade, etc.) |
| `/workout-plans` | `workout-plan.routes.ts` | CRUD de planos, dias, sessões de treino. `GET /workout-plans/active` devolve o plano **ativo** do usuário (ou 404), já ordenado de segunda a domingo — use-case `GetActiveWorkoutPlan` |
| `/stats` | `stats.routes.ts` | Estatísticas por período |
| `/ai` | `ai.routes.ts` | Chat streaming com tools da IA |
| `/auth/*` | `index.ts` | Sessão, login Google, etc. (better-auth) |

Documentação interativa: `http://localhost:3333/docs`

### Domínio principal (Prisma)

Schema: `packages/backend/prisma/schema.prisma`

- **User** + **UserProfile** — dados físicos (peso em gramas, altura em cm, % gordura 0–1000)
- **WorkoutPlan** — um plano ativo por usuário (`is_active`)
- **WorkoutDay** — 7 dias/semana (`WeekDay` enum), com `is_rest`
- **WorkoutExercise** — séries, reps, descanso
- **WorkoutSession** — início/conclusão de treino
- **Session**, **Account**, **Verification** — tabelas do better-auth

Colunas no banco usam **snake_case** (`@map`).

### IA — `packages/backend/src/routes/ai.routes.ts`

Endpoint `POST /api/ai` com **Vercel AI SDK**. O provedor/modelo de LLM é configurável por variáveis de ambiente — `LLM_PROVIDER` (`ollama` no dev local, `google` em produção) e `LLM_MODEL` — resolvidos em `lib/ai.ts` (`OLLAMA_BASE_URL` aponta para o servidor Ollama local; padrões: `ollama` → `gemma3`, `google` → `gemini-2.5-flash`). A IA usa tools que chamam os mesmos use-cases da API:

- `getUser`, `upsertUserProfile`
- `getWorkoutPlans`, `createWorkoutPlan`

Comportamento definido em `SYSTEM_PROMPT` no `.env` do backend (`packages/backend/.env.example`).

### Auth — `packages/backend/src/lib/auth.ts`

- **better-auth** com adapter Prisma
- Google OAuth + email/senha habilitado
- Cookie prefix: `training-manager`
- `getSession()` usado nas rotas para exigir autenticação

## Arquitetura do frontend

### Comunicação com a API

1. **Orval** gera o client em `packages/web/src/lib/api/fetch-generated/` a partir do OpenAPI (`packages/web/orval.config.ts`)
2. **`customFetch`** (`packages/web/src/lib/fetch.ts`) repassa cookies de sessão
3. **`dal.ts`** (`packages/web/src/lib/dal.ts`) — helper server-side `getUser()` com redirect para `/login`

Fluxo na home: se `getHomeData()` retorna ≠ 200 → redirect para `/onboarding` (sem plano ativo).

### `lib/` vs `helpers/` vs `contexts/` vs `hooks/`

- `packages/web/src/lib/` — **infraestrutura**: client de API (`api/`), auth, `dal.ts`, `fetch.ts`, `utils.ts`.
- `packages/web/src/helpers/` — **utilitários de regra de negócio/domínio** (ex.: `workout-day.ts` com `WEEKDAY_LABELS` e a regra de título por origem). Lógica de domínio sai de componentes e vai para cá.
- `packages/web/src/contexts/` — **contextos React**: `createContext` + provider + acessor trivial do contexto no mesmo arquivo (ex.: `coach-context.tsx` com `CoachProvider` e `useCoach`). Todo contexto novo deve morar aqui, não em `components/`.
- `packages/web/src/hooks/` — **hooks customizados com lógica** (ex.: `use-coach-chat.ts`, que compõe `useChat` do AI SDK com o contexto do coach). Hooks que fazem mais do que expor um contexto vão para cá, um arquivo por hook (`use-<nome>.ts`).

### Chat global

`packages/web/src/components/chat.tsx` — overlay controlado por query params (`chat_open`, `chat_initial_message` via **nuqs**). Conecta em `/api/ai` com streaming.

### UI

- **Tailwind CSS 4** + **shadcn/ui** (`packages/web/src/components/ui/`)
- Componentes de chat: `packages/web/src/components/ai-elements/`

## Fluxo do usuário

```
Login Google → Plano ativo?
  ├─ Não → /onboarding (chat IA coleta perfil + cria plano)
  └─ Sim → / (home: consistência, streak, treino do dia)
              └─ Coach IA overlay disponível globalmente
```

## O que ler antes de alterar

### Por tipo de mudança

| Se você vai... | Leia |
|----------------|------|
| Criar/alterar endpoint | `routes/*.ts`, schema Zod, use-case em `use-cases/` |
| Mudar regra de negócio | Use-case específico (ex.: `CreateWorkoutPlan.ts`, `GetHomeData.ts`) |
| Alterar auth/sessão | `backend/src/lib/auth.ts`, `web/src/lib/auth.ts`, `web/src/proxy.ts` |
| Mudar UI/páginas | `app/`, componentes em `(home)/_components/` |
| Trabalhar com IA | `ai.routes.ts`, `SYSTEM_PROMPT`, DTOs das tools |
| Tipos/contratos API | `schemas/` (response) e `dtos/` (request) no backend |

### Arquivos gerados — não editar manualmente

- `packages/backend/src/generated/prisma/`
- `packages/web/src/lib/api/fetch-generated/`

Após mudar a API, regenere o client: `cd packages/web && npx orval` (backend deve estar rodando).

## Como rodar localmente

```bash
# Raiz do monorepo
npm install

# Backend: Postgres via Docker
cd packages/backend && docker compose up -d
cp .env.example .env   # configure variáveis
npx prisma migrate dev
npm run dev            # porta 3333

# Web (outro terminal)
cd packages/web
cp .env.example .env
npm run dev            # porta 3000
```

Node: **v24.14.0** (`.nvmrc`).

## Pontos de atenção

1. **Um plano ativo por usuário** — `CreateWorkoutPlan` desativa o anterior automaticamente
2. **Plano sempre com 7 dias** — regra no `SYSTEM_PROMPT` (segunda a domingo)
3. **Unidades especiais** — peso em gramas, gordura 0–1000 (40% = 400)
4. **`enum WeekDay` começa no domingo** (`schema.prisma`) — o PostgreSQL ordena enums pela ordem de declaração, então `orderBy: { weekDay: 'asc' }` devolve a semana rotacionada (domingo primeiro). Quem precisa de segunda→domingo deve ordenar explicitamente, como faz `GetActiveWorkoutPlan`
5. **Rótulos dos dias da semana** — constante única em `packages/web/src/helpers/workout-day.ts` (`WEEKDAY_LABELS`), guardada em *title case* (`Segunda`); o card aplica `uppercase` via CSS e o header do dia usa o valor como está
6. **Onboarding em WIP** — `useChat()` sem transport configurado; mensagens são estáticas
7. **README raiz** — vazio; variáveis documentadas em `.env.example`

## Stack resumida

| Camada | Stack |
|--------|-------|
| Frontend | Next.js 16, React 19, Tailwind, shadcn, AI SDK |
| Backend | Fastify 5, Zod, Prisma 7, PostgreSQL |
| Auth | better-auth (Google OAuth + email/senha) |
| IA | AI SDK com provedor configurável: Ollama (dev) / Google Gemini 2.5 Flash (prod) |
| Contratos | OpenAPI → Orval → client tipado no frontend |
