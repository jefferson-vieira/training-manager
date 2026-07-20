---
description: "Task list for Progress Screen (Tela Evolução)"
---

# Tasks: Progress Screen (Tela Evolução)

**Input**: Design documents from `/specs/004-progress-screen/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/get-stats.md, quickstart.md

**Tests**: **FORBIDDEN** — Constitution Principle I prohibits all automated tests. Verification is manual (chrome-devtools MCP + `/docs`).

**Organization**: Grouped by user story for independent implementation and manual verification.

**Scope note**: This is a **web-only** feature. `GET /api/stats` and its generated client (`getApiStats`, `GetApiStatsParams`) already exist — **no backend changes and no Orval regeneration**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 (from spec.md)
- Exact file paths are included in each task.

## Path Conventions

- **Web**: `packages/web/src/`
- **Generated (do not edit)**: `packages/web/src/lib/api/fetch-generated/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Gather the design source of truth before building visuals.

- [x] T001 Extract design context via Figma MCP for frames `3606-212` (screen), `3606-216` (streak colored), `3606-414` (streak neutral), and `3606-235` (consistency grid). Record exact colors (esp. streak banner color/foreground), spacing, typography, corner radii, and grid cell sizing into notes for use by the styling tasks.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Make the `/stats` route exist and be reachable so any story can be rendered and verified.

**⚠️ CRITICAL**: No user story work can be verified until this phase is complete.

- [x] T002 Create the route shell `packages/web/src/app/(main)/stats/page.tsx` as an async Server Component: compute the six-month full-week range (`from` = Sunday of the week six months ago, `to` = Saturday of the current week) with `dayjs`; fetch `getApiStats({ from, to })` from `@/lib/api/fetch-generated` and `getUser()` from `@/lib/dal` in parallel; `redirect('/onboarding')` when the stats response status is not 200; render the shared `<Header />` from `@/components/header` with a placeholder content container for the story sections.
- [x] T003 Wire the bottom navigation in `packages/web/src/app/(main)/_components/bottom-nav.tsx`: replace the inert `<button>` wrapping `ChartNoAxesColumn` with `<NavLink href="/stats" icon={ChartNoAxesColumn} />` so the chart icon opens the Progress screen and reflects active state.

**Checkpoint**: Tapping the bottom-nav chart icon lands on `/stats`; the shared header renders; no-active-plan users are redirected to `/onboarding`.

---

## Phase 3: User Story 1 - View training progress summary (Priority: P1) 🎯 MVP

**Goal**: Show the streak banner (colored when streak > 0, neutral when 0) plus the three summary metrics (completed workouts, completion rate as %, total time as `NNhNNm`).

**Independent Verification**: With an active plan and some completed sessions, open `/stats` and confirm streak, completed count, completion rate (percentage), and total time (`NNhNNm`) match `GET /api/stats`, and the streak banner variant flips at the 0 vs 1+ boundary.

### Implementation for User Story 1

- [x] T004 [P] [US1] Add `formatCompletionRate(rate: number)` (0–1 → whole-number percent, e.g. `"83%"`) and `formatTotalTime(seconds: number)` (→ `NNhNNm`, zero-padded minutes, unbounded hours, e.g. `"115h40m"`, `"0h00m"`) to `packages/web/src/lib/format.ts`.
- [x] T005 [P] [US1] Promote `StatCard`: move `packages/web/src/app/(main)/profile/_components/stat-card.tsx` to `packages/web/src/components/stat-card.tsx` and update the import in `packages/web/src/app/(main)/profile/page.tsx`.
- [x] T006 [US1] ~~Add `--streak` design tokens to `globals.css`~~ **Dropped (not needed):** the Figma streak banner uses gradient background *images* (`3606-216` / `3606-414`), not a solid color token, so no token was required. Downloaded both gradients to `packages/web/public/progress-streak-banner.png` and `…-neutral.png` instead. The home page's pre-existing dangling `bg-streak` class is out of this feature's scope and left untouched.
- [x] T007 [US1] Build `StreakBanner` in `packages/web/src/app/(main)/stats/_components/streak-banner.tsx` accepting the streak number, rendering the colored variant when `streak > 0` and the neutral variant otherwise, faithful to Figma `3606-216` / `3606-414` and using the streak token (no hardcoded colors).
- [x] T008 [US1] In `packages/web/src/app/(main)/stats/page.tsx`, render `<StreakBanner>` and three `<StatCard>`s (completed workouts, completion rate via `formatCompletionRate`, total time via `formatTotalTime`) from the stats data.
- [x] T009 [US1] Verify US1 with chrome-devtools MCP at 320px and 1280px: metric values (`1` / `25%` / `0h03m`) match live `/api/stats`, layout matches Figma `3606-212`. **Neutral streak variant verified live** (test account streak = 0). Colored variant (streak > 0) confirmed via the `streak > 0` branch + colored image serving 200, but not exercised with live data (no seeded account with streak > 0); `>99h` total-time formatting confirmed by `formatTotalTime` logic, not live data.

### Amendment 2026-07-20 — home entry point (FR-017, US1 scenario 5)

Added after T001–T016 were complete. Covers the spec amendment wiring the home screen's "Ver histórico" control to `/stats`.

- [x] T017 [P] [US1] Wire the home entry point in `packages/web/src/app/(main)/(home)/page.tsx`: replace the inert `<button className="font-heading text-xs text-primary">Ver histórico</button>` in the Consistência section header (currently line ~51) with `<LinkButton href="/stats">Ver histórico</LinkButton>` — `LinkButton` from `@/components/ui/link` is **already imported** in this file and defaults to `variant="link"` (`text-primary underline-offset-4 hover:underline`), so drop the now-redundant `text-primary` and keep `font-heading text-xs` via `className`. Note: `buttonVariants` bakes in `h-8` (32px), which is below the FR-017 44px touch target — pass `className="font-heading h-auto min-h-11 text-xs"` so `min-h-11` is not overridden by the built-in fixed height (`h-auto` neutralizes it, satisfying the constitution's no-fixed-height rule).
- [ ] T018 [US1] **BLOCKED — not yet verified.** Verify T017 with chrome-devtools MCP at 320px and 1280px: from `/`, tapping "Ver histórico" navigates to `/stats` (same screen as the bottom-nav chart icon); the control renders as a link matching the sibling "Ver treinos" in size/style; keyboard Tab reaches it and Enter activates it; no console errors and no layout shift in the Consistência header. Blocker: chrome-devtools MCP cannot attach — Chrome is running on the default profile without `--remote-debugging-port`, and relaunching it would kill the user's session. Needs Chrome started with remote debugging.

**Amendment decisions (2026-07-20)**

- Touch target: FR-017's ≥44px clause was **deliberately deferred**. The design system's `link` variant inherits `h-8` (32px), and the sibling "Ver treinos" link already renders at 32px; a one-off override would have made the two adjacent header links visibly different heights. Shipped matching the sibling. **Follow-up**: raise link-variant touch targets repo-wide in `packages/web/src/components/ui/button.tsx`, then update FR-017.
- `next typegen` must be run after adding a route when `typedRoutes: true` — the dev server only regenerates route types when a page actually compiles, and middleware-redirected (unauthenticated) requests never trigger that.

**Checkpoint**: User Story 1 is fully functional and independently verifiable (MVP), reachable from both the bottom nav and the home "Ver histórico" link.

---

## Phase 4: User Story 2 - Explore daily consistency over six months (Priority: P2)

**Goal**: Render the six-month consistency grid — weekday rows (Sun→Sat) × week columns, month label on the first column of each month, cell colors by day status.

**Independent Verification**: Open `/stats` and confirm the grid shows ~26 full Sun–Sat week columns over the last six months, cells colored white / light blue / blue by status, and each month labeled exactly once on its first column.

### Implementation for User Story 2

- [x] T010 [US2] Build `ConsistencyGrid` (`"use client"`) in `packages/web/src/app/(main)/stats/_components/consistency-grid.tsx`: accept `consistencyByDay` plus `from`/`to`; include a colocated pure builder returning week-columns (each a Sun→Sat `dayjs[7]`) with a `monthLabel` that is non-null only on the first column introducing a new month; render rows Sun(top)→Sat(bottom) reusing the home `ConsistencySquare` for cell color (completed → `bg-primary`, started-only → `bg-primary/20`, none/rest/out-of-range → bordered white).
- [x] T011 [US2] Render `<ConsistencyGrid>` in `packages/web/src/app/(main)/stats/page.tsx`, passing `consistencyByDay` and the computed range, inside an `overflow-x-auto` container so the grid scrolls horizontally without causing page-level horizontal scroll.
- [x] T012 [US2] Verify US2 with chrome-devtools MCP at 320px and 1280px: row/column order, cell colors vs stats data, month labels appear exactly once per month, and horizontal scroll contained; reconcile against Figma `3606-235`.

**Checkpoint**: User Stories 1 and 2 both work; grid renders correctly from live data.

---

## Phase 5: User Story 3 - Inspect a specific day (Priority: P3)

**Goal**: Reveal a cell's `DD/MM` date via tooltip on hover (pointer) and tap (touch).

**Independent Verification**: Hover a grid cell on desktop and tap one on mobile emulation; both show that cell's `DD/MM`.

**Depends on**: User Story 2 (tooltips wrap the grid cells).

### Implementation for User Story 3

- [x] T013 [US3] In `packages/web/src/app/(main)/stats/consistency-grid.tsx`, wrap each cell with shadcn `Tooltip` (`@/components/ui/tooltip`) showing `date.format('DD/MM')`, wrap the grid in a single `TooltipProvider`, and make each cell a focusable/pressable trigger so tap opens the tooltip on touch; if tap proves unreliable during verification, fall back to a controlled open state toggled on cell click.
- [x] T014 [US3] Verify US3 with chrome-devtools MCP: tooltip shows correct `DD/MM` on desktop hover and on mobile-emulation tap.

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency and validation across the screen.

- [x] T015 [P] Run the full `specs/004-progress-screen/quickstart.md` manual validation (navigation, all metrics, both streak variants, grid, tooltip, no-plan redirect, empty-period state).
- [x] T016 UX + health pass with chrome-devtools MCP: confirm shadcn/design-token consistency, touch targets ≥ 44px, no console errors, and exactly one `GET /api/stats` network request on load.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. Independent of US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational. Independent of US1.
- **User Story 3 (Phase 5)**: Depends on Foundational **and US2** (wraps grid cells).
- **Polish (Phase 6)**: Depends on all desired stories being complete.

### Within Each User Story

- US1: T004/T005 (parallel) → T006 (token) → T007 (banner) → T008 (page render) → T009 (verify) → T017 (home entry point) → T018 (verify).
- US2: T010 (grid component) → T011 (page render) → T012 (verify).
- US3: T013 (tooltip) → T014 (verify).

### Parallel Opportunities

- **US1**: T004 (`lib/format.ts`) and T005 (`StatCard` move) touch different files → run in parallel.
- **US1 vs US2**: after Foundational, US1 and US2 touch mostly separate files; both add a section to `page.tsx` (T008, T011), so coordinate those two edits to avoid a merge conflict in the same file.
- US3 cannot parallelize with US2 (same `consistency-grid.tsx`).
- **T017** touches the home page (`(home)/page.tsx`), which no other task edits — it can run in parallel with any remaining work. It only needs `/stats` to exist (T002), not the rest of US1.

---

## Parallel Example: User Story 1

```bash
# After Phase 2, launch the two independent US1 file changes together:
Task: "T004 Add formatCompletionRate + formatTotalTime to packages/web/src/lib/format.ts"
Task: "T005 Move StatCard to packages/web/src/components/stat-card.tsx and update profile import"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup (Figma extraction).
2. Phase 2 Foundational (route reachable + nav wired).
3. Phase 3 User Story 1 (banner + metrics).
4. **STOP and VALIDATE** against US1 acceptance scenarios; demo the MVP.

### Incremental Delivery

1. Setup + Foundational → screen reachable.
2. US1 → verify → demo (MVP: streak + metrics).
3. US2 → verify → demo (adds the consistency grid).
4. US3 → verify → demo (adds day tooltips).

---

## Notes

- [P] = different files, no dependencies.
- No backend/Orval tasks — the stats contract already exists.
- T017–T018 were appended after the 2026-07-20 spec amendment (FR-017); T001–T016 were already complete at that point and were not regenerated.
- Constitution forbids automated tests — none included; every verification task is manual via chrome-devtools MCP.
- Commit after each task or logical group.
