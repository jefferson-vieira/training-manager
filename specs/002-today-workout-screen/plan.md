# Implementation Plan: Today's Workout Screen

**Branch**: `002-today-workout-screen` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-today-workout-screen/spec.md`

## Summary

Build the "Treino de Hoje" screen at the already-scaffolded route
`packages/web/src/app/(main)/workout-plans/[workoutPlanId]/days/[workoutDayId]/page.tsx`
(currently empty). It renders a workout day faithfully to the Figma prototype and
drives a three-state session flow: **not started** → **in progress** → **completed**.

The existing `GET /:workoutPlanId/days/:workoutDayId` already eager-loads the day's
sessions but does not expose them. The single backend change is to surface the
day's current session (id + `startedAt` + nullable `completedAt`) on
`WorkoutDaySchema`, then regenerate the Orval client. The frontend derives state
from that session, guards invalid/rest days with a server-side redirect, and uses
Next.js **Server Actions** (wrapping the generated `startWorkoutSession` /
`completeWorkoutSession` clients — which run through the server-only `customFetch`)
for the start/complete mutations, with sonner toasts and a "Finalizado!" success badge.

## Technical Context

**Language/Version**: TypeScript (Node v24.14.0 per `.nvmrc`)

**Primary Dependencies**: Backend — Fastify 5 + Zod + Prisma 7. Web — Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui, nuqs. New: **sonner** (toasts).

**Storage**: PostgreSQL via Prisma. No schema/migration change — `WorkoutSession` already exists and is loaded by `GetWorkoutDay`.

**Testing**: **NONE** — Constitution Principle I forbids all automated tests. Manual verification via chrome-devtools MCP + `/docs`.

**Target Platform**: Responsive web (mobile 320px → desktop 1280px+).

**Project Type**: npm workspaces monorepo — `packages/backend` + `packages/web`.

**Performance Goals**: Backend p95 < 200ms (single indexed day lookup, already loaded). Frontend: server-component data fetch, minimal client JS (only the interactive action island).

**Constraints**: Backend is the single source of truth — extend `WorkoutDaySchema`, then `npx orval`. No parallel frontend DTOs. Tailwind tokens only (no hardcoded colors); add a `--success` token for the badge if none exists. Pinned top card must not overlap the page header; pinned bottom bar must not overlap the fixed bottom nav.

**Scale/Scope**: 1 screen; 1 backend schema/use-case tweak + Orval regen; ~1 page + ~4 web components + 2 server actions; +1 npm dependency (sonner) + 1 shadcn badge component + `<Toaster/>` mount.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **No Automated Testing**: Zero test tasks/infra. Verification is manual (chrome-devtools MCP, `/docs`, local dev).
- [x] **Code Quality**: Session-state derivation lives in a use-case (backend) and a small utility/hook (web); mutations live in Server Actions; route handlers and components stay thin. No generated files edited by hand.
- [x] **UX Consistency**: Reuses shadcn/ui (`button`, new `badge`, `spinner`) and existing tokens; toast pattern via sonner mounted once; back/help controls match prototype.
- [x] **Responsive Design**: Mobile-first; verified at 320px and 1280px+; touch targets ≥ 44px; pinned card/bar respect header and bottom nav.
- [x] **Minimal Dependencies**: One new package — **sonner** — justified below (Complexity Tracking). Badge is a local shadcn component (no new npm dep; reuses existing cva/clsx/tailwind-merge).
- [x] **Performance**: No N+1 (single day query with `include`); frontend fetches server-side and ships only the action island as client JS.
- [x] **Package Rules**: sonner added to `packages/web`; backend schema change flows through Orval regen (documented in contracts + quickstart).

## Project Structure

### Documentation (this feature)

```text
specs/002-today-workout-screen/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── get-workout-day.md
└── checklists/
    └── requirements.md  # from /speckit-specify
```

### Source Code (repository root)

```text
packages/backend/src/
├── schemas/WorkoutDaySchema.ts          # ADD nullable `session` field
└── use-cases/workout-plan/GetWorkoutDay.ts  # map sessions[0] → `session` (ISO strings)

packages/web/src/
├── app/
│   ├── layout.tsx                       # mount <Toaster /> (sonner)
│   └── (main)/workout-plans/[workoutPlanId]/days/[workoutDayId]/
│       ├── page.tsx                     # server: fetch + redirect guards + compose
│       ├── actions.ts                   # 'use server' start/complete actions
│       └── _components/
│           ├── workout-day-header.tsx   # client: back (router.back) + inert help buttons
│           ├── exercise-list.tsx        # server: presentational exercises
│           └── workout-session-actions.tsx  # client: 3-state UI, toasts, pinned card/bar
├── components/ui/
│   ├── badge.tsx                        # NEW shadcn badge (+ success variant)
│   └── sonner.tsx                       # NEW shadcn Toaster wrapper
├── lib/api/fetch-generated/index.ts     # REGENERATED via `npx orval`
└── app/globals.css                      # ADD --success / --success-foreground token if absent
```

**Structure Decision**: Reuse the existing scaffolded route. Backend owns the
contract; the web client is regenerated, not hand-written. Business logic
(state derivation, mutations) sits outside components per the constitution.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New npm dependency: `sonner` | Spec explicitly requires success/error feedback as toasts; no toast primitive exists in the stack | Hand-rolling a toast system is more code, less accessible, and diverges from the shadcn conventions the project already uses; sonner is the shadcn-standard toaster |

## Notes / Key Decisions

- **State machine** (derived from the day's single session):
  - `session == null` → **NOT_STARTED**: top pinned "Iniciar treino" card visible; bottom bar hidden.
  - `session != null && completedAt == null` → **IN_PROGRESS**: bottom pinned "Marcar como concluído" bar visible; top button hidden.
  - `session != null && completedAt != null` → **COMPLETED**: "Finalizado!" success badge where the start action was; both action controls hidden.
- **Redirect guards** (server component, before render): `getWorkoutDay` status ≠ 200 **or** `isRest === true` → `redirect('/')`. Unauthenticated access already handled by `proxy.ts` + `getUser()`.
- **Mutations via Server Actions**: the generated clients use the server-only `customFetch`; a client island calls `'use server'` actions that wrap them, then `router.refresh()` to re-derive state from the server. Start action maps 409 (`SESSION_ALREADY_STARTED_ERROR`) to a reconcile path: refresh + informational toast (FR-018).
- **Duplicate-tap guard**: action island tracks `isPending` (via `useTransition`) and disables the control while in flight (FR-016).
- **Pinning without overlap**: header `sticky top-0`; start card `sticky` directly beneath it; complete bar `fixed` offset above the fixed bottom nav; content padded so the exercise list is never obscured. Exact offsets finalized against Figma during implementation.
- **Figma fidelity**: implementation must pull the referenced nodes via the Figma MCP (states: default 3606-679, start card 3606-815/833, complete bar 3606-790) and validate with chrome-devtools MCP at 320px and 1280px before completion.
- **Next.js docs**: per `packages/web/AGENTS.md`, read the relevant `node_modules/next/dist/docs/` pages (Server Actions, `redirect`, sticky/streaming) before writing the page.
