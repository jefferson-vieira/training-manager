# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read first

- `docs/CODEBASE.md` — full architecture, entry points, domain model, request/data flow, and "what to read before changing X". Written in Portuguese; it is the source of truth for structure.
- `.specify/memory/constitution.md` — binding engineering rules. Highest authority; overrides templates, skills, and agent instructions on conflict.

## Non-negotiable rules

- **No automated tests.** Do not write, plan, or add any test (unit, integration, e2e, snapshot). Verification is manual only: exercise user flows, use the API docs at `/docs`, inspect local dev. This supersedes any skill or template that asks for tests.
- **Never edit generated files:** `packages/backend/src/generated/prisma/` and `packages/web/src/lib/api/fetch-generated/`.
- **Business logic stays out of route handlers and React components** — backend logic goes in `use-cases/`, frontend logic in hooks/utilities.
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

- **Backend:** Fastify 5 + Zod (`fastify-type-provider-zod`) + Prisma 7 (PostgreSQL). Layered: `routes/` (HTTP, Zod validation, auth) → `use-cases/` (business logic classes with `execute()`) → `lib/db.ts`. Contracts in `schemas/` (responses) and `dtos/` (requests). Auth via **better-auth** (`lib/auth.ts`, Google OAuth + email/password, cookie prefix `training-manager`); protected routes call `getSession()`.
- **AI Coach:** `POST /api/ai` uses Vercel AI SDK + Gemini 2.5 Flash, streaming. AI tools call the same use-cases as the REST API. Behavior is driven by `SYSTEM_PROMPT` in the backend `.env`.
- **Frontend:** Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui. Server-side fetch via `lib/dal.ts` (`getUser()` redirects to `/login`); client calls go through the Orval client + `customFetch` (`lib/fetch.ts`) which forwards session cookies. Route protection is in `src/proxy.ts` (Next 16's `middleware.ts` replacement). Global Coach IA overlay is `components/chat.tsx`, controlled by nuqs query params.

## Domain gotchas

- **One active plan per user** — `CreateWorkoutPlan` deactivates the previous one automatically.
- **Plans always span 7 days** (Mon–Sun, `WeekDay` enum); rest days use `is_rest`.
- **Special units:** weight in grams, height in cm, body fat as 0–1000 (40% = 400).
- **Home flow:** if `getHomeData()` returns non-200, the home page redirects to `/onboarding` (user has no active plan).

## UI conventions

- Reuse shadcn/ui components in `packages/web/src/components/ui/` before building bespoke controls; use Tailwind tokens, not hardcoded colors/spacing.
- Mobile-first and responsive (usable at 320px and 1280px+); touch targets ≥ 44×44px. Verify UI manually at both widths.
- Figma-driven work follows `.cursor/rules/figma-mcp.mdc`.

## UI validation (mandatory)

Every frontend change MUST be validated with the **chrome-devtools MCP** before it is considered done. A UI task is not complete until you have:

1. Started the app and opened the affected page.
2. Waited for full render, then captured a screenshot.
3. Checked visual alignment, spacing, typography, colors, responsiveness, overflow, console errors, and failed network requests.
4. Compared the rendered UI against the provided prototype/design.
5. Explained, fixed, and re-validated any differences — repeat until the rendered UI matches the design.

Only then mark the task complete.
