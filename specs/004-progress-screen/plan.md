# Implementation Plan: Progress Screen (Tela Evolução)

**Branch**: `004-progress-screen` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-progress-screen/spec.md`

## Summary

Add a read-only "Evolução" (Progress) screen at `/stats`, reachable from the
bottom-nav chart icon. It renders, from the **already-existing** `GET /api/stats`
endpoint: a streak banner (colored when streak > 0, neutral when 0), a
six-month day-by-day consistency grid (weekday rows Sun–Sat × week columns, month
labels on first column of each month, `DD/MM` tooltip on hover/tap), and three
summary metrics (completed workouts, completion rate as %, total time as `NNhNNm`).
No active plan (stats 404) redirects to `/onboarding`, matching the home flow.

**Technical approach**: Pure frontend feature. A Next.js Server Component page
fetches `getApiStats` (Orval client) with a full-week-aligned six-month range,
reuses the shared logo `Header`, the profile `StatCard`, and the home
`ConsistencySquare`/`Tooltip` primitives, and adds a client-side consistency grid
component for interactivity. **No backend or Orval changes required** — the stats
contract already exists in the generated client (`getApiStats`, `GetApiStatsParams`).

## Technical Context

**Language/Version**: TypeScript (Node v24.14.0 per `.nvmrc`)

**Primary Dependencies**: Next.js 16 + React 19 + Tailwind 4 + shadcn (web only). `dayjs` (already used by home consistency components).

**Storage**: N/A for this feature (consumes existing read endpoint).

**Testing**: **NONE** — Constitution Principle I forbids all automated tests. Manual verification via chrome-devtools MCP + `/docs`.

**Target Platform**: Web, responsive mobile (320px) + desktop (1280px+).

**Project Type**: npm workspaces monorepo — change is confined to `packages/web`.

**Performance Goals**: Single server-side `getApiStats` call on page render (no client waterfall); grid is ~26 columns × 7 rows (~182 lightweight cells).

**Constraints**: No new npm dependencies; reuse shadcn/ui + existing components and design tokens; server-side data fetch via Orval client on a Server Component.

**Scale/Scope**: 1 new route (`/stats`), 1 bottom-nav wiring change, ~3 new colocated components, small additions to `lib/format.ts`, and (if needed) a streak design token in `globals.css`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **No Automated Testing**: Plan includes zero test tasks, test infra, or test frameworks. Verification is manual (chrome-devtools MCP).
- [x] **Code Quality**: Grid/date-range computation lives in pure helper functions (colocated pure builders, mirroring existing `getWeekDates`), not inside JSX; formatting lives in `lib/format.ts`. Page/components stay declarative.
- [x] **UX Consistency**: Reuses shared `Header`, profile `StatCard`, home `ConsistencySquare`, and shadcn `Tooltip`; matches existing screen structure (server fetch → `redirect('/onboarding')` on non-200).
- [x] **Responsive Design**: Grid horizontally scrolls within its own container at narrow widths; metrics use existing responsive card grid; touch targets ≥ 44px on interactive cells/nav.
- [x] **Minimal Dependencies**: No new packages. `dayjs` and shadcn primitives already present.
- [x] **Performance**: Server Component with one `getApiStats` fetch; no client data fetching; `ConsistencySquare` is a trivial div.
- [x] **Package Rules**: Change is web-only. No API contract change → no Orval regeneration needed. Business logic kept out of components.

**Result**: PASS. No violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/004-progress-screen/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (view model derived from stats)
├── quickstart.md        # Phase 1 output (manual validation guide)
├── contracts/
│   └── get-stats.md     # Consumed API contract (existing endpoint)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root) — web-only changes

```text
packages/web/src/
├── app/
│   ├── (main)/
│   │   ├── _components/
│   │   │   └── bottom-nav.tsx          # MODIFY: wire chart icon → NavLink to /stats
│   │   └── progress/                    # NEW route
│   │       ├── page.tsx                 # NEW: Server Component; getApiStats + redirect
│   │       └── _components/
│   │           ├── streak-banner.tsx    # NEW: colored (>0) vs neutral (0) variant
│   │           └── consistency-grid.tsx # NEW ("use client"): grid + month labels + DD/MM tooltip
│   └── globals.css                      # MODIFY (if needed): add --streak token for colored banner
├── components/
│   ├── header.tsx                       # REUSE (logo header)
│   └── stat-card.tsx                    # MOVE here from profile/_components (shared by profile + progress)
└── lib/
    └── format.ts                        # ADD: formatCompletionRate(%), formatTotalTime(NNhNNm)
```

**Structure Decision**: Confined to `packages/web`. `StatCard` is promoted from
`profile/_components/` to `components/` because it is now shared by two routes
(constitution: reuse before bespoke); profile import path updated in the same
change set. `ConsistencySquare` is reused in place from the home `_components`
(imported by the grid); if lint/boundary concerns arise it may also be promoted,
decided during implementation.

## Complexity Tracking

> No constitution violations — section intentionally empty.
