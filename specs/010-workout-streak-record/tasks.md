---

description: "Task list for Recorde de Sequência de Treinos"
---

# Tasks: Recorde de Sequência de Treinos (Workout Streak Record)

**Input**: Design documents from `/specs/010-workout-streak-record/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api-changes.md](./contracts/api-changes.md), [quickstart.md](./quickstart.md)

**Tests**: **FORBIDDEN** — Constitution Principle I prohibits all automated tests. Verification is manual, via `quickstart.md`.

**Organization**: Grouped by user story. Note that the badge (US1) is small; the weight of this feature is the materialized-state migration in Phase 2, which every story sits on.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US3)
- Exact file paths included in every task

## Path Conventions

- **Backend**: `packages/backend/src/`
- **Web**: `packages/web/src/`
- **Database**: `packages/backend/prisma/schema.prisma`
- **Generated (never hand-edit)**: `packages/backend/src/generated/`, `packages/web/src/lib/api/fetch-generated/`, `packages/web/src/lib/api/schemas/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema and script scaffolding

- [X] T001 Add the `WorkoutStreak` model and the `workoutStreak WorkoutStreak?` back-relation on `User` to `packages/backend/prisma/schema.prisma`, exactly as specified in `data-model.md` (`userId` as `@id`, `lastWorkoutDay` as `@db.Date`, snake_case `@map` on every column)
- [X] T002 Generate and apply the migration: `cd packages/backend && npx prisma migrate dev --name add_workout_streak` (depends on T001; creates the table empty — it is seeded manually, see `quickstart.md` Step 1)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The materialized state and the shared continuity rule. This is "Slice 1" from plan.md.

**⚠️ CRITICAL**: No user story can be implemented until this phase completes.

- [X] T004 Create `packages/backend/src/use-cases/streak/WorkoutStreakRules.ts` — a pure module with **no Prisma import**. Extend dayjs with `dayjs/plugin/utc.js` (same pattern as the existing `isToday` extension in `CalcStreak.ts`). Export `toStreakDay(date)` returning the UTC `YYYY-MM-DD` key (FR-006), `buildPlanSchedule(workoutPlans)` returning plans sorted by `createdAt` descending with their non-rest weekday sets, `wasScheduledOn(day, schedule)` resolving the plan active *on that day* (FR-008a), and `hasMissedScheduledDay(afterDay, throughDay, schedule, completedDays)` (FR-008/FR-009). Today must never count as missed — it has not elapsed.
- [X] T005 Create `packages/backend/src/use-cases/streak/RebuildWorkoutStreak.ts` implementing the forward-walk algorithm in `data-model.md`: load all completed sessions across **all** plans (traverse `workoutDay.workoutPlan.userId` — sessions have no `userId` column), project to unique UTC days, walk forward tracking `longest`, then apply the expiry check between the final day and today before upserting. Accept an optional transaction client so it can run inside the completion transaction (T019). (depends on T004)
- [X] T006 Create `packages/backend/src/use-cases/streak/ReadWorkoutStreak.ts` — read the row, apply the FR-014 expiry correction (reset `currentStreak` to 0 and persist when a scheduled day has fully elapsed since `lastWorkoutDay`), never lower `longestStreak` (FR-015), and return an all-zero result **without writing** when no row exists (FR-017a). (depends on T004)
- [X] T007 Migrate `packages/backend/src/use-cases/stats/GetStats.ts` to obtain the streak from `ReadWorkoutStreak`. Remove the `CalcWorkoutStreak` call and drop the 6-month window from the streak path only — `from`/`to` still bound `consistencyByDay`, `completedWorkoutsCount`, `conclusionRate`, and `totalTimeInSeconds`. (depends on T006)
- [X] T008 Migrate `packages/backend/src/use-cases/home/GetHomeData.ts` to obtain the streak from `ReadWorkoutStreak`. Remove the `CalcWorkoutStreak` call and the week-bounded streak window — `weekSessions` is still needed for `consistencyByDay`. `HomeSchema` is **not** edited; only the value behind `workoutStreak` changes. (depends on T006)
- [X] T009 Delete `packages/backend/src/use-cases/CalcStreak.ts` and confirm no imports of `CalcWorkoutStreak` remain anywhere in `packages/backend/src/` (depends on T007, T008)
- [X] T010 Verify Home and Stats now report the identical current streak for an account with a streak longer than 7 days, per `quickstart.md` Step 3 (FR-020, SC-008)

**Checkpoint**: The two-number bug is fixed and reads are O(1). This is independently deployable with no badge.

---

## Phase 3: User Story 1 - See my all-time record in the streak banner (Priority: P1) 🎯 MVP

**Goal**: The trophy badge reading `RECORDE: N DIAS` inside the `/stats` streak banner.

**Independent Verification**: Set `longest_streak` directly in the DB and load `/stats` — the badge renders correctly in both banner variants without the rest of the table having been seeded. Full acceptance is `quickstart.md` Step 2.

### Implementation for User Story 1

- [X] T011 [US1] Add `workoutStreakRecord: z.number()` to `packages/backend/src/dtos/GetStatsResponse.ts`, keeping object keys alphabetically sorted (`eslint-plugin-perfectionist` enforces this)
- [X] T012 [US1] Return `workoutStreakRecord` from `packages/backend/src/use-cases/stats/GetStats.ts`, sourced from the `ReadWorkoutStreak` result (depends on T011)
- [X] T013 [US1] With the backend running, regenerate the typed client: `cd packages/web && npx orval`. Confirm the diff touches only the stats response type and that no generated file is hand-edited. (depends on T012)
- [X] T014 [P] [US1] Load the `figma-design-to-code` skill (mandatory per CLAUDE.md), then call `get_design_context` for node `3606:224` in file `Vdvl7fFXQ4TH0ktjwhr7dK` and reconcile the badge's real tokens against the inferred styling in `research.md` R7 before writing any CSS
- [X] T015 [US1] Add a `record: number` prop and the badge to `packages/web/src/app/(protected)/(main)/stats/_components/streak-banner.tsx`: reuse `Badge` from `@/components/ui/badge` with the banner's existing glass treatment (`border-white/15 bg-white/15 text-white backdrop-blur-xs`, matching the flame circle above it), a lucide `Trophy` icon, uppercase copy, `DIA` when the record is exactly 1 and `DIAS` otherwise (FR-003), rendered unconditionally — including `RECORDE: 0 DIAS` at `record === 0` (FR-004) — and no nested ternary (depends on T013, T014)
- [X] T016 [US1] Destructure `workoutStreakRecord` from the stats response and pass it to `StreakBanner` in `packages/web/src/app/(protected)/(main)/stats/page.tsx`; use the Orval-generated type, define no local DTO (depends on T013)
- [X] T017 [US1] Verify with the chrome-devtools MCP at 320px and 1280px: both banner variants, singular/plural copy, three-digit record without wrap or clip, no console errors, no failed requests — `quickstart.md` Step 2 (FR-005)

**Checkpoint**: US1 is fully functional and demonstrable. This plus Phases 1–2 is the MVP.

---

## Phase 4: User Story 2 - My record updates the moment I beat it (Priority: P2)

**Goal**: Completing a workout advances the streak and raises the record inside the same transaction as the completion.

**Independent Verification**: With `current_streak == longest_streak`, complete today's workout via the UI and reload `/stats` — both incremented. `quickstart.md` Steps 4, 5, 9.

### Implementation for User Story 2

- [X] T018 [US2] Create `packages/backend/src/use-cases/streak/ApplyWorkoutCompletionToStreak.ts` implementing the completion transition table in `data-model.md`: no-op when the day equals `lastWorkoutDay` (FR-007); **delegate to `RebuildWorkoutStreak`** when the day is at or before `lastWorkoutDay` (FR-012b, the backdated case); otherwise extend or restart at 1 based on `hasMissedScheduledDay`, raising `longestStreak` when exceeded (FR-012) (depends on T005)
- [X] T019 [US2] Wrap the body of `packages/backend/src/use-cases/workout-plan/CompleteWorkoutSession.ts` in `prisma.$transaction(async (tx) => …)` and invoke `ApplyWorkoutCompletionToStreak` inside it, so a streak failure rolls the completion back (FR-012a). Keep the existing guard clauses and `NotFoundError` behavior; handle async errors with `try/catch`, never a chained `.catch()`. (depends on T018)
- [X] T020 [US2] Inside that transaction, serialize per-user access before reading the streak: `INSERT INTO workout_streak … ON CONFLICT DO NOTHING` then `SELECT user_id FROM workout_streak WHERE user_id = $1 FOR UPDATE` via `tx.$queryRaw` (FR-018, research.md R4) (depends on T019)
- [X] T021 [US2] Verify a new personal best increments both values, and that a completion below the record leaves `longest_streak` untouched — `quickstart.md` Step 4
- [X] T022 [US2] Verify same-day idempotency in the DB, not just the UI (`quickstart.md` Step 5), and the backdated-completion rebuild (`quickstart.md` Step 9)

**Checkpoint**: Streaks advance correctly and the record can never be understated by an out-of-order completion.

---

## Phase 5: User Story 3 - My record is preserved when my streak breaks (Priority: P2)

**Goal**: An expired streak resets to 0 on read while the record survives untouched.

**Independent Verification**: Seed stale state with a scheduled day elapsed unworked, load `/stats`, confirm 0 current / record intact / correction persisted.

**Note**: The implementation for this story lands in `ReadWorkoutStreak` (T006), because FR-014's correctness is required the moment anything reads the state — shipping Phase 2 without it would display stale streaks. This phase is therefore verification, deliberately, rather than manufactured implementation tasks.

### Verification for User Story 3

- [X] T023 [US3] Verify expiry resets `current_streak` to 0, leaves `longest_streak` unchanged, and **persists** the correction — re-query the row to confirm it is on disk, not just in the response — and confirm no scheduled job was involved (FR-013, FR-014, FR-015), per `quickstart.md` Step 6
- [X] T024 [US3] Verify the current day never breaks a streak: with `last_workout_day = yesterday` and today scheduled but unworked, `/stats` still shows the streak intact (FR-008)
- [X] T025 [US3] Verify rest days do not break a streak, and that creating a new plan with different rest days does not retroactively rewrite past continuity (FR-008a), per `quickstart.md` Step 7

**Checkpoint**: All three read-path guarantees hold.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T030 [P] Run `cd packages/backend && npm run lint && npm run build` — both clean
- [X] T031 [P] Run `cd packages/web && npm run lint && npm run build` — both clean
- [X] T032 [P] Confirm `/docs` (Scalar) shows `workoutStreakRecord` on the stats response, and that the home response is unchanged
- [X] T033 Verify read cost: with a few hundred seeded sessions, `/` and `/stats` perform a single-row streak lookup with no session scan, staying within the < 200ms p95 budget (SC-003), per `quickstart.md` Step 10
- [X] T034 Verify atomicity by temporarily forcing the streak update to throw: the completion request fails **and** `workout_session.completed_at` stays `NULL`; remove the forced error afterwards (FR-012a), per `quickstart.md` Step 8
- [X] T035 Execute the full `quickstart.md` procedure end to end as the final gate, including the closing checklist
- [X] T036 Write the release note flagging that Home's displayed streak will visibly jump for every user past 7 days (FR-019 correction #3) — intended behavior that will otherwise be reported as a regression

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)**: depends on Phase 2
- **US2 (Phase 4)**: depends on Phase 2 (specifically T005)
- **US3 (Phase 5)**: depends on Phase 2 (verification of T006)
- **Polish (Phase 6)**: depends on all desired stories

### User Story Dependencies

- **US1 (P1)**: independent after Phase 2 — verifiable by seeding `longest_streak` directly
- **US2 (P2)**: independent after Phase 2 — no dependency on US1
- **US3 (P2)**: independent after Phase 2 — verification only
- **US4 (P3)**: no tasks — satisfied by seeding `workout_streak` manually (`quickstart.md` Step 1). Must be done before real-data verification of any other story; until the table is seeded, every existing user reads 0/0 (FR-017a).

### Critical Path

```
T001 → T002 → T004 → T005 ──→ T018 → T019 → T020   (US2)
              T004 → T006 ─┬→ T007 ─┐
                           └→ T008 ─┴→ T009 → T010
                                     T011 → T012 → T013 → T015/T016  (US1)
```

### Parallel Opportunities

- T007 and T008 are different files but both depend on T006; they can be done in parallel by different people, though T009 needs both
- T014 (Figma context) runs parallel to T011–T013 — it touches no code
- After Phase 2: US1 and US2 can proceed in parallel by different developers
- T030, T031, T032 are independent of each other

---

## Parallel Example: After Phase 2 completes

```bash
# Two developers, two stories, no shared files:
Developer A: T011–T017  (US1 — contract, Orval, badge)
Developer B: T018–T022  (US2 — completion transaction)
```

`GetStats.ts` is touched by both T007 (Phase 2) and T012 (US1) — sequence those, do not parallelize.

---

## Implementation Strategy

### MVP (Phases 1–3)

1. Phase 1: Setup — schema and migration
2. Phase 2: Foundational — materialized state, both read paths migrated
3. **STOP and VALIDATE**: Home and Stats agree (T010). Shippable on its own; fixes the two-number bug with no new UI.
4. Phase 3: US1 — the badge
5. **STOP and VALIDATE**: `quickstart.md` Step 2 at both widths
6. Seed `workout_streak` manually (`quickstart.md` Step 1) before showing the badge to real users

### Incremental Delivery

1. Phases 1–2 → deploy (invisible fix; Home's streak becomes correct)
2. + manual seeding of `workout_streak` → real records exist in the DB
3. + US1 → deploy the badge (MVP complete)
4. + US2 → completions maintain the streak transactionally
5. + US3 verification → read-path guarantees confirmed
6. Phase 6 → final gate

Note that US2 is not optional for correctness — without it the materialized state never advances on new workouts. It is sequenced after US1 only because US1 is P1 by user value. If you deploy US1 without US2, streaks freeze at their seeded values.

---

## Notes

- [P] = different files, no dependencies on incomplete work
- Constitution forbids automated tests — no test tasks appear here and none may be added
- Guard clauses / early returns and `try/catch` (never chained `.catch()`) apply to all new backend code
- Never hand-edit anything under `generated/` or `fetch-generated/`
- Commit after each task or logical group
- Every checkpoint is a valid stopping point for independent validation

## Verification findings (2026-08-04)

- **FR-004 was inverted on 2026-08-04.** T017 originally caught the badge rendering `RECORDE: 0 DIAS` when the record was 0, which the then-current FR-004 forbade, and a `RecordBadge` guard-clause component was added to hide it. The product decision then changed: the record must **always** be visible, `0 DIAS` included. The guard and its wrapper were removed (a wrapper with no guard has no purpose), the `Badge` returned inline to `StreakBanner`, and FR-004, quickstart case 2.3, and `contracts/api-changes.md` were rewritten to match. Re-verified at `record = 0`.
- Pre-existing, out of scope, not caused by this feature: the `/stats` hydration warning comes from a browser extension injecting `id="esg_atica"`; CORS advertises only `GET,HEAD,POST`, so a browser-side `PATCH` to the API fails (the app proxies server-side); Zod param/querystring validation failures surface as 500 rather than 400.

## Task Summary

| Phase | Tasks | Count |
|---|---|---|
| 1 — Setup | T001–T002 | 2 |
| 2 — Foundational | T004–T010 | 7 |
| 3 — US1 (P1) 🎯 | T011–T017 | 7 |
| 4 — US2 (P2) | T018–T022 | 5 |
| 5 — US3 (P2) | T023–T025 | 3 |
| 6 — Polish | T030–T036 | 7 |
| **Total** | | **31** |

US4 (P3) carries no tasks: `workout_streak` is seeded manually per `quickstart.md` Step 1. T003 and T026–T029 were removed for the same reason; task IDs are left unrenumbered so existing references stay valid.
