# Phase 0 Research: Recorde de Sequência de Treinos

**Feature**: [spec.md](./spec.md) | **Date**: 2026-08-03

The spec carries no `[NEEDS CLARIFICATION]` markers — four `/speckit-clarify` passes resolved eight decisions. This document covers the technical unknowns that surfaced while translating those decisions into a design.

---

## R1 — Where does the per-day workout history live?

**Decision**: Derive it from the existing `WorkoutSession` table. Do **not** add a day-level history table.

**Rationale**: The spec's Assumptions explicitly leave this to planning ("introducing a separate day-level history record is an implementation choice left to planning, not a user-visible requirement"). `WorkoutSession` already satisfies every property FR-016 demands of the source of truth: it is append-only in practice (routes expose only `POST` create and `PATCH` complete — no delete, no edit), it retains `startedAt` and `completedAt`, and it is never rewritten to reflect streak rules.

A day-level table would need to be kept in sync with sessions, creating a second derived structure to backfill and a second place for the rules to drift — the exact problem the materialized state is meant to contain.

It also resolves a naming collision: the supplied architecture doc calls the history table `WorkoutDay`, but `WorkoutDay` already exists in `schema.prisma` as the plan's weekday template holding exercises. Deriving from sessions means the name is never needed.

**Alternatives considered**:
- *`WorkoutDayHistory` table written on completion* — rejected: adds a second derived artifact to backfill and keep consistent, for no gain while sessions are immutable.
- *Reuse the doc's `WorkoutDay` name* — rejected: collides with an existing model.

---

## R2 — UTC day boundary with dayjs

**Decision**: `dayjs.extend(utc)` from `dayjs/plugin/utc.js`, and derive every streak day as `dayjs.utc(startedAt).format('YYYY-MM-DD')`.

**Rationale**: The spec fixes the day boundary at UTC for all users (Clarifications). Today's `CalcStreak.ts` uses bare `dayjs(startedAt).format('YYYY-MM-DD')`, which silently resolves to the server process's timezone — that is the defect FR-019 correction #1 addresses. The utc plugin ships inside the installed `dayjs@1.11.19`, so **no new dependency** (Constitution V), and the file already establishes the plugin-import precedent with `dayjs/plugin/isToday.js`.

`lastWorkoutDay` is stored as Postgres `DATE` (`@db.Date`) rather than a timestamp, so no timezone can be reintroduced at the storage layer.

**Alternatives considered**:
- *Per-user timezone column* — rejected by the user during clarification (option C in session 2); would require a schema change, an onboarding capture step, and a fallback for existing users.
- *`date-fns-tz`* — rejected: a second date library alongside dayjs directly violates Constitution V.

---

## R3 — Structuring the plan-aware continuity rule for three callers

**Decision**: Extract the rule into a pure module, `use-cases/streak/WorkoutStreakRules.ts`, exposing:

- `toStreakDay(date): string` — the UTC `YYYY-MM-DD` key (FR-006).
- `buildPlanSchedule(workoutPlans)` — plans sorted by recency with their non-rest weekday sets, mirroring today's `plansByRecency`.
- `wasScheduledOn(day, schedule): boolean` — was `day` a scheduled workout day under the plan active *on that day* (FR-008a)?
- `hasMissedScheduledDay(afterDay, throughDay, schedule, completedDays): boolean` — did any scheduled day in the interval fully elapse without a workout (FR-008/FR-009)?

**Rationale**: FR-006 requires the completion-time update, the on-demand validation, and the rebuild to agree exactly on day attribution and continuity. Three independent implementations is how that guarantee rots. One pure module with no Prisma import keeps the rule in a single place and makes the rebuild's forward walk and the expiry check's backward reasoning share a predicate.

Note the direction change from today's code: `CalcStreak` walks **backward** from today over a bounded window. The rebuild needs a **forward** walk over all history to find the maximum streak ever reached (FR-010), so the rule is expressed as a day-level predicate rather than a loop.

**Alternatives considered**:
- *Keep `CalcWorkoutStreak` and call it from all three* — rejected: its signature is built around a bounded `fromDate`/`toDate` window and returns only the current streak, never the maximum.
- *Duplicate the rule per caller* — rejected outright; FR-006 exists to prevent it.

---

## R4 — Atomicity and concurrency (FR-012a, FR-018)

**Decision**: Wrap the completion in a Prisma interactive transaction, `prisma.$transaction(async (tx) => { … })`, and serialize per-user access by locking the streak row first:

```
SELECT user_id FROM workout_streak WHERE user_id = $1 FOR UPDATE
```

issued via `tx.$queryRaw`. When no row exists, `INSERT … ON CONFLICT DO NOTHING` then take the lock.

**Rationale**: FR-012a requires the session completion and the streak update to commit together — an interactive transaction is the direct expression of that, and Prisma 7 supports it. FR-018 additionally requires that two near-simultaneous completions cannot double-count; the transaction alone does not provide that under Postgres's default `READ COMMITTED` isolation, because both could read the same pre-state. An explicit row lock makes the second wait for the first, so it observes the updated `lastWorkoutDay` and correctly treats its day as already counted (FR-007).

`WorkoutStreak.userId` is the primary key, so the lock target is exactly one row per user and never escalates.

**Alternatives considered**:
- *`SERIALIZABLE` isolation* — rejected: pushes retry handling onto every caller for a contention case this narrow.
- *Optimistic concurrency with a version column* — rejected: also needs retry logic, and adds a column no requirement asks for.
- *No lock, rely on the transaction* — rejected: does not satisfy FR-018 under `READ COMMITTED`.

---

## R5 — Detecting the out-of-order completion (FR-012b)

**Decision**: Inside the locked transaction, compare the completed session's streak day against the stored `lastWorkoutDay`. If `day <= lastWorkoutDay`, discard the incremental path and call `RebuildWorkoutStreak` for that user within the same transaction. Otherwise apply the incremental update.

**Rationale**: `CompleteWorkoutSession` sets `completedAt: new Date()` with no recency constraint, so a session started days ago can be completed today; since FR-006 dates a workout by `startedAt`, that retroactively fills a past day. The forward-only increment in FR-012 cannot express it, and the record would be permanently understated.

Worth noting the *forward* late completion needs no special handling: if `day > lastWorkoutDay`, the incremental path extends the streak and banks the record correctly, and the next read's FR-014 expiry check resets the current streak if intervening scheduled days elapsed. The record is captured before the reset, which is exactly the required outcome. Only the backward case needs the rebuild.

**Alternatives considered**:
- *Reject stale completions* — rejected by the user (option A in session 3); would also reject the legitimate 23:40→00:20 midnight case the spec preserves.
- *Accept the drift* — rejected by the user (option C); knowingly ships a wrong record.

---

## R6 — Running the backfill (FR-017a, FR-017b)

**Decision**: A standalone script at `packages/backend/src/scripts/backfill-workout-streaks.ts`, run with the already-installed `tsx`, exposed as `npm run backfill:streaks` in `packages/backend/package.json`. It pages through users who have at least one completed session and calls the same `RebuildWorkoutStreak` used by FR-012b and FR-017.

**Rationale**: The backend has no existing job/script infrastructure (`package.json` has only `build`, `dev`, `lint`), and Constitution V discourages adding a runner for one script. `tsx` is already a devDependency and already runs `dev`, so this costs nothing new.

Idempotency (FR-017b) falls out of the design rather than being bolted on: the rebuild computes state purely from history and `upsert`s the result, so a second run writes identical values. An interrupted run leaves earlier users correct and later users missing, and re-running completes them.

**Alternatives considered**:
- *Prisma migration `-- data` step* — rejected: mixes schema and data migration, and cannot be re-run independently when it fails partway.
- *Lazy rebuild on read* — rejected by the user (option A in session 2); would also break SC-003's unconditional O(1) read guarantee.

---

## R7 — Badge composition on the frontend

**Decision**: Reuse `components/ui/badge.tsx` with `variant="secondary"` overridden to the banner's existing glass treatment — `className="border-white/15 bg-white/15 text-white backdrop-blur-xs"` — plus lucide's `Trophy` icon as a child. Render unconditionally, including `RECORDE: 0 DIAS` at `record === 0` (FR-004) — no guard, no nested ternary.

**Rationale**: Constitution III requires reaching for the design-system component before hand-styling a `<span>`. `Badge` already supplies `inline-flex`, `w-fit`, `rounded-full`, `gap-1`, `whitespace-nowrap`, and `[&_svg]:size-3.5` — every structural property the prototype's pill needs, including the `whitespace-nowrap` that satisfies the three-digit case in FR-005. The `white/15` glass values are lifted from the flame circle directly above it in `streak-banner.tsx`, so the two elements stay visually coherent on both the orange and neutral backgrounds.

Pluralization (`DIA`/`DIAS`, FR-003) is inlined in the component, matching the existing precedent two lines away (`{streak === 1 ? 'dia' : 'dias'}`). A `helpers/` module for a single ternary would be heavier than the rule it encodes.

**Open item**: exact tokens are inferred from the prototype screenshot. Before finalizing Slice 2, load the `figma-design-to-code` skill and call `get_design_context` for node `3606:224` per CLAUDE.md, then reconcile. This plan fixes the structure, not the pixel values.

**Alternatives considered**:
- *New `glass` variant on `Badge`* — deferred: one consumer does not justify extending the shared variant set; revisit if a second glass badge appears.
- *Hand-styled `<span>`* — rejected by Constitution III.

---

## R8 — Which surfaces read the materialized state

**Decision**: A single `ReadWorkoutStreak` use-case, consumed by both `GetStats` and `GetHomeData`. `GetStats` additionally returns the record; `GetHomeData` returns only the current streak.

**Rationale**: FR-020 requires every surface reporting the current streak to read one value, and forbids any surface retaining an independent windowed calculation. Both use-cases currently construct `new CalcWorkoutStreak()` with different windows, which is the source of the two-number defect. Centralizing the read also places FR-014's expiry correction in exactly one place, so it cannot be applied on Stats and forgotten on Home.

The record stays off the Home contract because the spec scopes the badge to Stats (Clarifications, session 2) and Constitution VI requires payloads to carry only fields the client consumes.

**Alternatives considered**:
- *Expose the record on Home too* — rejected by the user (option B in session 2, declined) and by payload leanness.
- *Leave Home on `CalcWorkoutStreak`* — rejected: violates FR-020 and ships the known bug.
