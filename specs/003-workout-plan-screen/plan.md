# Implementation Plan: Workout Plan Screen

**Branch**: `003-workout-plan-screen` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-workout-plan-screen/spec.md`

## Summary

Add a `/workout-plan` screen showing the user's active plan for the week (Figma
`3606-79`), reached from the bottom navigation's calendar icon and the home screen's
"Ver treinos" button. A new `GET /workout-plans/active` endpoint returns the active
plan or 404 → onboarding, which structurally prevents a stale plan from ever rendering.
Training day cards link into the existing feature-002 day screen, whose header becomes
day-aware via a `?from=home` origin marker while preserving "Treino de Hoje" for the
home flow.

**Technical approach**: Backend-first per the API-contract flow — new use-case + route,
reusing the existing `GetWorkoutPlanResponse` DTO, then `npx orval`, then the UI. The
page is a Server Component calling the generated client directly and redirecting on
non-200, matching the home and day pages. No new dependencies, no migration.

**The one non-obvious risk**: `enum WeekDay` is declared **Sunday-first**
(`schema.prisma:39-47`), so the natural `orderBy: { weekDay: 'asc' }` silently returns
a rotated week. The use-case sorts explicitly against a canonical `WEEK_ORDER`. See
research.md §1.

## Technical Context

**Language/Version**: TypeScript (Node v24.14.0 per `.nvmrc`)

**Primary Dependencies**: Fastify 5 + Prisma 7 (backend); Next.js 16 + React 19 + Tailwind 4 + shadcn (web) — **no new packages**

**Storage**: PostgreSQL via Prisma — **no migration; read-only feature**

**Testing**: **NONE** — Constitution Principle I forbids all automated tests. Manual verification per [quickstart.md](./quickstart.md).

**Target Platform**: Web (responsive mobile + desktop); API on Node server

**Project Type**: npm workspaces monorepo — `packages/backend` + `packages/web`

**Performance Goals**: Backend p95 < 200ms — single `findFirst` with `_count` (no N+1, no exercise bodies); web page is an RSC with no client waterfall

**Constraints**: Minimal new dependencies; snake_case DB columns; Orval-generated client; no edits to `src/generated/` or `lib/api/fetch-generated/`

**Scale/Scope**: 1 new endpoint, 1 new use-case, 1 new page, 1 new component, 4 touched files; fixed 7-row payload

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial evaluation** (pre-Phase 0):

- [x] **No Automated Testing**: Zero test tasks/infra. Verification is quickstart.md.
- [x] **Code Quality**: Query + sort live in `GetActiveWorkoutPlan` use-case, not the route. Header-title rule is a pure helper, not inline in a component.
- [x] **UX Consistency**: Reuses `WorkoutDayCard` unchanged for training days, `NavLink`, shadcn `Badge`, existing redirect-on-non-200 pattern.
- [x] **Responsive Design**: 320px/1280px + ≥44px targets required by FR-018; chrome-devtools MCP validation is mandatory.
- [x] **Minimal Dependencies**: None added.
- [x] **Performance**: `_count` instead of loading exercises; RSC; `priority` on the LCP banner.
- [x] **Package Rules**: Backend owns the contract; Orval regen is an explicit, ordered step before UI work.

**Post-Phase 1 re-evaluation**: All gates still pass. Design added no abstraction layer,
no dependency, and no test surface. The one judgement call — a separate
`WorkoutRestCard` rather than an `isRest` branch inside `WorkoutDayCard` — *strengthens*
Principle II (single responsibility) and is argued in research.md §3. It is not a
violation and needs no Complexity Tracking entry.

## Project Structure

### Documentation (this feature)

```text
specs/003-workout-plan-screen/
├── plan.md              # This file
├── research.md          # Phase 0 — the Sunday-first enum trap + 8 other decisions
├── data-model.md        # Phase 1 — no migration; derived values; label table
├── quickstart.md        # Phase 1 — manual validation script
├── contracts/
│   └── get-active-workout-plan.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/
├── backend/src/
│   ├── routes/
│   │   └── workout-plan.routes.ts          # MODIFY: add GET /active
│   ├── use-cases/workout-plan/
│   │   └── GetActiveWorkoutPlan.ts         # NEW: isActive selector + WEEK_ORDER sort
│   └── dtos/
│       └── GetWorkoutPlanResponse.ts       # REUSE unchanged
└── web/src/
    ├── app/(main)/
    │   ├── _components/bottom-nav.tsx      # MODIFY: inert <button> -> <NavLink href="/workout-plan">
    │   ├── (home)/page.tsx                 # MODIFY: "Ver treinos" -> link; day link gains ?from=home
    │   ├── workout-plan/                   # NEW
    │   │   ├── page.tsx                    #   RSC: getActiveWorkoutPlan() | redirect('/onboarding')
    │   │   └── _components/
    │   │       ├── workout-plan-banner.tsx #   banner + plan-name badge
    │   │       └── workout-rest-card.tsx   #   350x110 "Descanso" card
    │   └── workout-plans/[workoutPlanId]/days/[workoutDayId]/
    │       ├── page.tsx                    # MODIFY: read searchParams -> derive title
    │       └── _components/workout-day-header.tsx  # MODIFY: accept title prop
    ├── components/
    │   └── workout-day-card.tsx            # MODIFY: WEEKDAY_LABELS moves out (render unchanged)
    ├── helpers/
    │   └── workout-day.ts                  # NEW: shared WEEKDAY_LABELS (title case) + title helper (business-rule util)
    ├── lib/
    │   └── api/fetch-generated/            # REGENERATED via npx orval — never hand-edited
    └── public/
        └── workout-plan-banner.jpg         # NEW: exported from Figma 3606:80
```

**Structure Decision**: npm workspaces monorepo. Backend owns API contracts; web
consumes via the Orval-generated client. No test directories per constitution.
`WEEKDAY_LABELS` is promoted from module-private in `workout-day-card.tsx` to
`helpers/workout-day.ts` because three surfaces now need it (card, day header, and the
label table in data-model.md). It lands in `src/helpers/` — not `src/lib/` — because
`helpers/` is where **domain/business-rule utilities** live (the weekday-label mapping
and the origin→title rule are domain rules), while `lib/` is reserved for
infrastructure (`api/`, `auth.ts`, `dal.ts`, `fetch.ts`).

## Implementation Order

The dependency chain is strict at the start and parallel at the end:

1. **Backend contract** — `GetActiveWorkoutPlan` use-case (with the `WEEK_ORDER` sort),
   then the route. Verify via `/docs` **before** any UI exists (quickstart Step 1) —
   especially `workoutDays[0].weekDay === "MONDAY"`.
2. **`npx orval`** (backend running) — gates every frontend task; nothing downstream
   typechecks without `getActiveWorkoutPlan`.
3. **Shared label move** — `helpers/workout-day.ts`; confirm the home card still renders
   `SEGUNDA`.
4. **Then, independently**: the plan screen + rest card + banner asset; the nav/home
   links; the day-header origin marker.
5. **UI validation** — chrome-devtools MCP at 320px/1280px against Figma `3606-79` and
   `3606-810` (mandatory; a UI task is not done until it matches).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. No new dependencies, no new abstraction layers, no new services, no
migration. Table intentionally empty.
