# Implementation Plan: Recorde de Sequência de Treinos

**Branch**: `010-workout-streak-record` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-workout-streak-record/spec.md`

## Summary

Add the all-time streak record ("Recorde") as a trophy badge in the `/stats` streak banner, and replace the two existing read-time streak calculations with a single materialized `WorkoutStreak` row per user.

The badge is a few lines of JSX. The substance of the work is the persistence migration underneath it, which also resolves three defects the spec uncovered: Home and Stats currently compute the same `workoutStreak` over different windows (7 days vs 180 days) and display different numbers; streaks past ~6 months are silently truncated; and no timezone is defined anywhere, so day attribution depends on the server process's locale.

**Approach**: keep `WorkoutSession` as the sole history — no new history table. Derive the per-day workout history from completed sessions, and materialize only the streak state. This sidesteps the `WorkoutDay` naming collision in the supplied architecture doc (that name is already taken by the plan's weekday template) and keeps the schema addition to one table.

## Technical Context

**Language/Version**: TypeScript (Node v24.14.0 per `.nvmrc`)

**Primary Dependencies**: Fastify 5 + Prisma 7.4.2 (backend); Next.js 16 + React 19 + Tailwind 4 + shadcn (web). **No new packages** — UTC support comes from `dayjs/plugin/utc.js`, already bundled with the installed `dayjs@1.11.19`.

**Storage**: PostgreSQL via Prisma. One new model (`WorkoutStreak`), one migration.

**Testing**: **NONE** — Constitution Principle I forbids all automated tests. Manual verification via `quickstart.md`.

**Target Platform**: Web (responsive 320px–1280px+); API on Node server

**Project Type**: npm workspaces monorepo — `packages/backend` + `packages/web`

**Performance Goals**: Streak reads become a single indexed row lookup (SC-003). Backend p95 < 200ms preserved; the only non-constant path is the rare out-of-order completion rebuild (FR-012b), on the write side.

**Constraints**: snake_case DB columns via `@map`; Orval regen required after the `GetStatsResponse` change; backfill must run before release (FR-017a).

**Scale/Scope**: 1 new Prisma model, 4 new backend units, 2 existing use-cases migrated, 1 use-case wrapped in a transaction, 1 backfill script, 1 DTO field, 1 React component change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **No Automated Testing**: Zero test tasks, test infra, or frameworks in this plan. Verification is `quickstart.md` only.
- [x] **Code Quality**: All logic lands in `use-cases/`; routes stay thin; the completion transaction is orchestrated in the use-case, not the handler. Guard-clause/early-return and `try/catch` (never chained `.catch()`) rules apply to all new code.
- [x] **UX Consistency**: Badge reuses `components/ui/badge.tsx` with the same `border-white/15 bg-white/15 backdrop-blur-xs` treatment already used by the flame circle in `streak-banner.tsx`. No new visual language.
- [x] **Responsive Design**: Badge is `w-fit` + `whitespace-nowrap` inside a centered flex column; verify at 320px including three-digit records. Non-interactive, so the 44px touch-target rule does not apply.
- [x] **Minimal Dependencies**: No new npm packages. `dayjs/plugin/utc.js` ships with the existing dayjs install, matching the existing `isToday` plugin precedent in `CalcStreak.ts`.
- [x] **Performance**: Reads become O(1) single-row lookups, replacing two windowed session scans. No N+1 — the rebuild loads sessions and plans in two queries.
- [x] **Package Rules**: Backend owns the contract; `GetStatsResponse` gains one field, then `cd packages/web && npx orval`. Frontend invents no parallel DTO.

**Result: PASS — no violations.** The Complexity Tracking table is omitted per its own instruction ("Fill ONLY if Constitution Check has violations").

Re-checked after Phase 1 design: still PASS. The design adds one table and no abstraction layers; the shared rules module is de-duplication (preventing three copies of the continuity rule), not a new layer.

## Project Structure

### Documentation (this feature)

```text
specs/010-workout-streak-record/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api-changes.md   # Phase 1 output
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (files this feature touches)

```text
packages/backend/
├── prisma/
│   └── schema.prisma                         # + WorkoutStreak model, User relation
└── src/
    ├── dtos/
    │   └── GetStatsResponse.ts               # + workoutStreakRecord
    ├── scripts/
    │   └── backfill-workout-streaks.ts       # NEW — FR-017a release gate
    └── use-cases/
        ├── CalcStreak.ts                     # DELETED once both call sites migrate
        ├── streak/                           # NEW
        │   ├── WorkoutStreakRules.ts         # pure continuity predicates
        │   ├── RebuildWorkoutStreak.ts       # full history → state (FR-017)
        │   ├── ApplyWorkoutCompletionToStreak.ts  # incremental or rebuild (FR-012/012b)
        │   └── ReadWorkoutStreak.ts          # read + expiry correction (FR-014)
        ├── home/GetHomeData.ts               # migrate to ReadWorkoutStreak
        ├── stats/GetStats.ts                 # migrate + expose record
        └── workout-plan/CompleteWorkoutSession.ts  # wrap in transaction

packages/web/src/
├── app/(protected)/(main)/stats/
│   ├── page.tsx                              # pass record through
│   └── _components/streak-banner.tsx         # + Badge
└── lib/api/                                  # Orval regen output (generated — do not hand-edit)
```

**Structure Decision**: npm workspaces monorepo, unchanged. The new `use-cases/streak/` folder groups the four streak units, matching the existing `use-cases/{home,stats,user,workout-plan}/` convention. `CalcStreak.ts` currently sits loose at the `use-cases/` root; its replacement moves into the folder.

## Implementation Sequencing

The spec's User Story 1 (the badge, P1) claims to be independently shippable. **It is not** — it sits on top of FR-011 through FR-018. Two slices, in order:

**Slice 1 — Materialized state (no badge, but user-visible).**
Schema + migration, the four streak units, backfill script, `CompleteWorkoutSession` transaction, and migrating `GetStats`/`GetHomeData` off `CalcWorkoutStreak`. Delivers FR-006 through FR-020 and SC-002 through SC-008. Users see no new element, but Home's streak jumps to the true value — the fix for the two-number bug. Independently deployable and worth shipping alone.

**Slice 2 — The badge (User Story 1).**
`GetStatsResponse` field, Orval regen, `StreakBanner` badge. Delivers FR-001 through FR-005 and SC-001. Small, and only meaningful once Slice 1 exists.

`/speckit-tasks` should preserve this order. Shipping Slice 2 first is not possible; shipping Slice 1 alone is.

## Key Risks

| Risk | Mitigation |
|------|-----------|
| Backfill skipped or partial at release → both streak and record read 0 on Home *and* Stats for every existing user (FR-017a) | Treat as a release gate, not a deploy step. Script is idempotent (FR-017b) and re-runnable. Verify a known account before enabling Slice 2. |
| Home's displayed streak visibly jumps for every user past 7 days | Intended (FR-019 correction #3). Flag to whoever writes release notes — it will read as a regression to support staff. |
| Continuity rule drifting between the three call sites (incremental, expiry, rebuild) | All three consume `WorkoutStreakRules.ts`; none reimplements the predicate. FR-006 makes this explicit. |
| Concurrent completions double-counting (FR-018) | Row-level `SELECT … FOR UPDATE` on the streak row inside the interactive transaction. See research.md R4. |
| Figma badge styling guessed rather than read | Slice 2 must call `get_design_context` for node `3606:224` (after loading the `figma-design-to-code` skill, per CLAUDE.md) before finalizing the badge. This plan specifies structure, not exact tokens. |

## Phase Status

- [x] Phase 0 — research.md
- [x] Phase 1 — data-model.md, contracts/api-changes.md, quickstart.md
- [ ] Phase 2 — tasks.md (`/speckit-tasks`)

`update-agent-context.sh` is not present in `.specify/scripts/bash/`; that step was skipped.
