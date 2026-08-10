# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read first

- `docs/CODEBASE.md` — full architecture, entry points, domain model, request/data flow, and "what to read before changing X". Written in Portuguese; it is the source of truth for structure.
- `.specify/memory/constitution.md` — binding engineering rules. Highest authority; overrides templates, skills, and agent instructions on conflict.

## Non-negotiable rules

- **No automated tests.** Do not write, plan, or add any test (unit, integration, e2e, snapshot). Verification is manual only: exercise user flows, use the API docs at `/docs`, inspect local dev. This supersedes any skill or template that asks for tests.
- **Never edit generated files:** `packages/backend/src/generated/prisma/`, `packages/web/src/lib/api/fetch-generated/`, `packages/web/src/lib/api/query-generated/` and `packages/web/src/lib/api/schemas/`.
- **Business logic stays out of route handlers and React components** — backend logic goes in `use-cases/`, frontend logic in hooks or utilities. Frontend utilities that encode **domain/business rules** (e.g. label mappings, derived-title rules) live in `packages/web/src/helpers/`; `packages/web/src/lib/` is reserved for infrastructure (`api/`, `auth.ts`, `chat.ts`, `dal.ts`, `fetch.ts`, `utils.ts`).
- **React contexts live in `packages/web/src/contexts/`** (`createContext` + provider + the trivial context accessor in one file, e.g. `coach-context.tsx`) — never in `components/`. **Custom hooks with logic** live in one file per hook (`use-<name>.ts`), positioned by scope: shared across routes → `packages/web/src/hooks/` (e.g. `use-coach-chat.ts`); specific to one route → colocated in that route's folder (e.g. `app/(auth)/login/use-sign-in-form.ts`), until another route imports it. Never in `components/`.
- **Always use the early-return (guard clause) pattern when applicable** — handle edge/error/negative cases first and `return` immediately, instead of `if/else` chains, `else` branches, or nested conditionals/ternaries. The happy path stays last, unindented, at the function's base level.
- **Always handle async errors with `try/catch`, never with a chained `.catch()`** — even when the `.catch()` would be shorter. Treat the `catch` as a guard clause with an immediate `return`, keeping the happy path after the block at the function's base level.
- **Prefer a single object parameter over positional parameters** whenever two or more arguments are interchangeable — same type, or types that accept each other — since a swapped call site still compiles. Destructure at the signature (`function f({ a, b }: { a: string; b: string })`) so every call names its arguments.
- **Never create elements without a purpose, and never add CSS classes without necessity.** No empty spacer/wrapper markup, no redundant nesting, no decorative or unused classes. Every element and class must earn its place; if removing it changes nothing, remove it.
- **Database columns are snake_case** via Prisma `@map`.
- Add dependencies to the correct workspace package (`packages/backend` or `packages/web`), not the root.

## Commands

npm workspaces monorepo. Node **v24.14.0** (`.nvmrc`). Run `npm install` at the root.

Backend (`packages/backend`):

```bash
docker compose up -d          # Postgres
npx prisma migrate dev        # apply/create migrations
npm run dev                   # tsx watch, port 3333, docs at /docs
npm run build                 # tsc -b
npm run lint                  # eslint
```

Web (`packages/web`):

```bash
npm run dev                   # next dev, port 3000
npm run build
npm run lint
```

Both packages need a `.env` (`cp .env.example .env`). There is no test command by design (see rules above).

## API contract flow (important)

The backend is the single source of truth for API shapes. After any change to backend routes/schemas/DTOs, regenerate the typed web client:

```bash
# backend must be running
cd packages/web && npx orval
```

The frontend must not invent parallel DTOs. Breaking API changes must update the OpenAPI output, regenerate Orval, and adjust consuming pages in the same change set.

## Architecture at a glance

- **Backend:** Fastify 5 + Zod (`fastify-type-provider-zod`) + Prisma 7 (PostgreSQL). Layered: `routes/` (HTTP, Zod validation, auth) → `use-cases/` (business logic classes with `execute()`) → `lib/db.ts`. Contracts in `schemas/` (responses) and `dtos/` (requests). Auth via **better-auth** (`lib/auth.ts`, Google OAuth + email/password, cookie prefix `training-manager`); protected routes call `getSession()`. Session duration and the sign-in rate limit are env-configurable: `AUTH_SESSION_EXPIRES_IN` (default 30 days), `AUTH_RATE_LIMIT_MAX` (10) and `AUTH_RATE_LIMIT_WINDOW` (300s).
- **AI Coach:** `POST /api/ai` uses Vercel AI SDK, streaming. The LLM provider/model is env-configurable via `LLM_PROVIDER` (`ollama` for local dev, `google` for production) and `LLM_MODEL`, resolved in `lib/ai.ts`; `OLLAMA_BASE_URL` points at the local Ollama server. AI tools call the same use-cases as the REST API. Behavior is driven by `SYSTEM_PROMPT` in the backend `.env`.
- **Frontend:** Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui. Server-side fetch via `lib/dal.ts` (`getUser()` redirects to `/login`); server components and server actions go through the Orval client + `customFetch` (`lib/fetch.ts`), which forwards session cookies from `next/headers`. Client components use the second Orval output (`lib/api/query-generated/`, TanStack Query hooks) + the axios mutator (`lib/axios.ts`), which calls the API directly with `withCredentials: true` and rejects with an `AxiosError` (carrying the status) on non-2xx. The `QueryClient` is built in `config/query-client.ts` — its `MutationCache` answers any 401 by navigating to `/login`, so no individual flow repeats that — and is mounted by `app/providers.tsx` in the root layout. Route protection is in `src/proxy.ts` (Next 16's `middleware.ts` replacement). Global Coach IA drawer is `components/chat.tsx`; the shared conversation (AI SDK `Chat` instance) and the drawer handle live in `contexts/coach-context.tsx` (provider mounted in the `(protected)` route-group layout, so the chat survives navigation, including onboarding → app) and are consumed via `hooks/use-coach-chat.ts`. Domain/business-rule utilities live in `src/helpers/`; `src/lib/` holds infrastructure only; contexts in `src/contexts/`; logic hooks in `src/hooks/`.

## Domain gotchas

- **One active plan per user** — `CreateWorkoutPlan` deactivates the previous one automatically.
- **Plans always span 7 days** (Mon–Sun, `WeekDay` enum); rest days use `is_rest`.
- **Special units:** weight in grams, height in cm, body fat as 0–1000 (40% = 400).
- **Home flow:** if `getHomeData()` returns non-200, the home page redirects to `/onboarding` (user has no active plan).

## UI conventions

- **Design system first**: Prefer shadcn/ui components (`packages/web/src/components/ui/`) and existing internal components over hand-styling native HTML tags. Instead of a native `<button>` carrying many utility classes, use `Button` and pass only the classes needed to reach the target visual (same for `Badge`, `Card`, inputs, etc.). Use the **shadcn MCP/skill and Context7** to analyze and choose the right component. Only style a native tag when no suitable pre-styled component exists or a component would not make sense (e.g. semantic wrappers). Balance keeping the component's built-in styling against the customization needed for visual consistency; when customization is significant, decide deliberately whether to create a more specific component or override the base component's styles.
- **Icons inside `Button` need `data-icon`** — an icon rendered next to text must carry `data-icon="inline-start"` (icon before the text) or `data-icon="inline-end"` (icon after it); the `size` variants use `has-data-[icon=…]` selectors to trim the padding on that side, so without it the button gets full padding on both sides. Icon-only sizes (`icon`, `icon-xl`, …) must not carry the attribute.
- Mobile-first and responsive (usable at 320px and 1280px+); touch targets ≥ 44×44px. Verify UI manually at both widths.
- **Do not size elements with a fixed CSS `height`** (`h-*` / `h-[…]`). An element's size must be determined by its own content together with `padding`, `margin`, and `border` — not a hardcoded height. Use `min-h-*`/`max-h-*` for constraints (e.g. the 44px touch target). A fixed `height` is allowed only when strictly necessary to preserve the visual meaning and the design system (e.g. a fixed-ratio media banner that would otherwise collapse or grow unbounded), and the reason must be documented in a comment.
- Figma-driven work follows `.cursor/rules/figma-mcp.mdc`.

## UI validation (mandatory)

Every frontend change MUST be validated with the **chrome-devtools MCP** before it is considered done. A UI task is not complete until you have:

1. Started the app and opened the affected page.
2. Waited for full render, then captured a screenshot.
3. Checked visual alignment, spacing, typography, colors, responsiveness, overflow, console errors, and failed network requests.
4. Compared the rendered UI against the provided prototype/design.
5. Explained, fixed, and re-validated any differences — repeat until the rendered UI matches the design.

Only then mark the task complete.
