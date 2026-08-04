# Phase 1 Data Model: Recorde de Sequência de Treinos

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md) | **Date**: 2026-08-03

## Overview

One new table. No changes to any existing table's columns — `WorkoutSession` remains the untouched source of truth (FR-016), and the only edit to an existing model is the back-relation on `User`.

```
User ──1:1── WorkoutStreak        (NEW — materialized, derived)
  │
  └──1:N── WorkoutPlan ──1:N── WorkoutDay ──1:N── WorkoutSession
                                                    (history — source of truth)
```

---

## New model: `WorkoutStreak`

```prisma
model WorkoutStreak {
  userId         String    @id @map("user_id")
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  currentStreak  Int       @default(0) @map("current_streak")
  longestStreak  Int       @default(0) @map("longest_streak")
  lastWorkoutDay DateTime? @map("last_workout_day") @db.Date
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  @@map("workout_streak")
}
```

Add to `User`:

```prisma
  workoutStreak WorkoutStreak?
```

### Field notes

| Field | Purpose | Constraints |
|---|---|---|
| `userId` | Primary key **and** foreign key | `@id` enforces FR-011's one-row-per-user without a separate unique index, and gives the `FOR UPDATE` lock (R4) exactly one row to take. `onDelete: Cascade` disposes of the cache with the user. |
| `currentStreak` | Sequência Atual | `>= 0`. Reset to 0 by expiry (FR-009/FR-014); restart at 1 on a completion after a break (FR-012). |
| `longestStreak` | Recorde | `>= currentStreak` at all times. **Monotonic** — FR-010 and FR-015 forbid any write that lowers it, including the read-time correction. |
| `lastWorkoutDay` | Most recent counted day | Postgres `DATE`, not a timestamp — the UTC day is resolved once at write time (R2) so no timezone can re-enter at storage. `NULL` only before the first counted workout. |
| `createdAt` / `updatedAt` | Audit | Matches the convention on every existing model. Not read by any requirement; `@updatedAt` maintains it automatically. |

### Why `DATE` and not `TIMESTAMPTZ`

Every other timestamp in the schema is `@db.Timestamptz`, so this is a deliberate exception. `lastWorkoutDay` is a *calendar day*, not an instant. Storing it as a timestamp would invite `dayjs(lastWorkoutDay)` comparisons that reintroduce the server-local ambiguity FR-019 correction #1 exists to remove. `DATE` makes day arithmetic exact.

### Derivation invariant (FR-016)

Every field is recomputable from `WorkoutSession` + `WorkoutPlan` history alone. `RebuildWorkoutStreak` is the definition of that derivation; the incremental path in FR-012 is an optimization that must agree with it. If they ever disagree, the rebuild wins.

---

## Existing models — read, never written

### `WorkoutSession` (source of truth)

```prisma
startedAt   DateTime  @db.Timestamptz   // decides WHICH day (FR-006)
completedAt DateTime? @db.Timestamptz   // decides WHETHER it counts (FR-006)
```

A session contributes a day when `completedAt IS NOT NULL`. The day is `UTC(startedAt)` formatted `YYYY-MM-DD`. Multiple sessions mapping to one day collapse to a single day (FR-007).

Sessions are reachable per-user only through `workoutDay.workoutPlan.userId` — there is no direct `userId` column. Both the rebuild and the backfill must traverse that path, and must span **all** plans (active and inactive), since history predates the current plan.

### `WorkoutPlan` + `WorkoutDay` (the schedule)

Continuity is plan-aware (FR-008/FR-008a): the plan in effect on a past day is the most recently created plan whose `createdAt` is not after that day. `WorkoutDay.isRest` marks non-scheduled weekdays; `WorkoutDay.weekDay` is the `WeekDay` enum, indexed to match `dayjs().day()`.

**Do not** substitute the currently-active plan for past days — that would retroactively rewrite continuity when a user switches plans.

---

## State transitions

Let `D` be the streak day of a newly completed workout, and `L` the stored `lastWorkoutDay`.

| Condition | Transition | Requirement |
|---|---|---|
| `L IS NULL` | `current = 1`, `longest = max(longest, 1)`, `last = D` | FR-012 |
| `D == L` | no change (day already counted) | FR-007 |
| `D < L` | **rebuild from history** — discard incremental path | FR-012b |
| `D > L`, no missed scheduled day in `(L, D)` | `current += 1`, `longest = max(longest, current)`, `last = D` | FR-012 |
| `D > L`, a scheduled day in `(L, D)` elapsed unworked | `current = 1`, `longest` unchanged, `last = D` | FR-012 |

Read path (every read, both surfaces):

| Condition | Transition | Requirement |
|---|---|---|
| A scheduled day in `(L, today)` has fully elapsed unworked | `current = 0`, `longest` **unchanged**, `last` unchanged; persist | FR-014, FR-015 |
| Otherwise | return as stored | FR-014 |
| No row exists | return `current = 0`, `longest = 0`; **write nothing** | FR-017a |

Today never breaks a streak — it has not finished yet (FR-008).

---

## Rebuild algorithm (`RebuildWorkoutStreak`)

The shared derivation behind FR-012b, FR-017, and the backfill.

1. Load all completed sessions for the user across all plans; project to a sorted set of unique UTC streak days.
2. Load all the user's plans with their non-rest weekdays; sort by `createdAt` descending (`plansByRecency`).
3. Walk the days **forward**, tracking a running streak:
   - First day → running = 1.
   - Subsequent day `D` after previous `P` → if no scheduled day in `(P, D)` elapsed unworked, running += 1; else running = 1.
   - After each step, `longest = max(longest, running)`.
4. After the last day, apply the expiry check between it and today. If a scheduled day has elapsed, `current = 0`; else `current = running`.
5. `upsert` the row.

Step 4 is what makes the rebuild agree with the read path — without it a rebuild could return a stale non-zero current streak that the very next read would immediately reset.

Cost is O(days with workouts), and it runs only on the backfill, on the rare out-of-order completion, and on an explicit rule-change reprocess. It is never on a read path (SC-003).

---

## Migration

One Prisma migration creating `workout_streak` (`npx prisma migrate dev --name add_workout_streak`). Purely additive: a new table plus a foreign key to `user`. No existing column is altered, no data is moved, and no backwards-compatibility shim is required.

The table is created **empty**. Populating it is the backfill's job (FR-017a) and is a release gate, not part of the migration (R6) — the two must not be conflated, because the backfill has to be independently re-runnable.
