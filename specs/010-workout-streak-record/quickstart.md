# Quickstart & Manual Validation: Recorde de Sequência de Treinos

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-03

Constitution Principle I forbids automated tests. This is the complete verification procedure — a feature is done when every scenario below passes at both 320px and 1280px.

---

## Prerequisites

```bash
nvm use                                  # Node v24.14.0 per .nvmrc
npm install                              # from repo root

cd packages/backend
docker compose up -d                     # Postgres
cp .env.example .env                     # if not already present
npx prisma migrate dev                   # applies the workout_streak migration
npm run dev                              # port 3333, API docs at /docs

cd ../web
cp .env.example .env                     # if not already present
npm run dev                              # port 3000
```

You need a signed-in account with an **active workout plan** — `/stats` redirects to `/onboarding` without one.

Because streaks depend on dates in the past, most scenarios require seeding `workout_session` rows directly. Open a psql shell:

```bash
docker compose exec -T postgres psql -U postgres -d training_manager
```

### Seeding helper

Sessions have no `user_id`; they attach through `workout_day → workout_plan → user`. Find a scheduled (non-rest) workout day for your user:

```sql
SELECT wd.id, wd.week_day, wd.is_rest
FROM workout_day wd
JOIN workout_plan wp ON wp.id = wd.workout_plan_id
WHERE wp.user_id = '<USER_ID>' AND wp.is_active = true
ORDER BY wd.week_day;
```

Insert a completed session for a specific day (UTC — that is the streak boundary, FR-006):

```sql
INSERT INTO workout_session (id, workout_day_id, started_at, completed_at, created_at, updated_at)
VALUES (gen_random_uuid(), '<WORKOUT_DAY_ID>',
        '2026-08-01T10:00:00Z', '2026-08-01T11:00:00Z', now(), now());
```

After changing history directly, update the cache so state matches (see Step 1).

---

## Step 1 — Seed the streak state (FR-017a, SC-006)

The release gate. Do this before anything else.

There is no backfill script — `workout_streak` is populated manually. For each account under test, compute the longest and current runs from that account's completed sessions and write the row directly:

```sql
INSERT INTO workout_streak (user_id, current_streak, longest_streak, last_workout_day, created_at, updated_at)
VALUES ('<USER_ID>', <CURRENT>, <LONGEST>, '<YYYY-MM-DD>', now(), now())
ON CONFLICT (user_id) DO UPDATE
SET current_streak   = EXCLUDED.current_streak,
    longest_streak   = EXCLUDED.longest_streak,
    last_workout_day = EXCLUDED.last_workout_day,
    updated_at       = now();
```

```sql
SELECT user_id, current_streak, longest_streak, last_workout_day FROM workout_streak;
```

**Expect**: one row per user who has at least one completed session. `longest_streak` matches the longest run computable from that account's history.

**Note**: `last_workout_day` is a UTC date (FR-006) and must equal the UTC day of that account's most recent completed session, otherwise the expiry check in Step 6 will not behave correctly.

---

## Step 2 — Badge rendering (FR-001–FR-005, SC-001)

| # | Setup | Open | Expect |
|---|---|---|---|
| 2.1 | Account with record ≥ 2 and a live streak | `/stats` | Badge below "Sequência Atual", trophy icon, `RECORDE: N DIAS`, uppercase, on the orange banner |
| 2.2 | `UPDATE workout_streak SET current_streak = 0 WHERE user_id = '<ID>';` | `/stats` | Banner switches to the neutral variant; badge **still visible** and legible |
| 2.3 | `UPDATE workout_streak SET current_streak = 0, longest_streak = 0 WHERE user_id = '<ID>';` | `/stats` | "0 dias"; badge **still rendered**, reading `RECORDE: 0 DIAS` (FR-004) |
| 2.4 | `UPDATE workout_streak SET longest_streak = 1 WHERE user_id = '<ID>';` | `/stats` | Reads `RECORDE: 1 DIA` — singular (FR-003) |
| 2.5 | `UPDATE workout_streak SET longest_streak = 365 WHERE user_id = '<ID>';` | `/stats` at 320px | Badge does not wrap, clip, or push the banner into horizontal scroll (FR-005) |

Verify 2.1 and 2.5 at **both** 320px and 1280px. Per CLAUDE.md, use the chrome-devtools MCP: screenshot, then check alignment, spacing, typography, colors, overflow, console errors, and failed network requests. Compare against Figma node `3606:224`.

---

## Step 3 — Home and Stats agree (FR-020, SC-008)

The regression this feature fixes.

1. Seed a streak longer than 7 days (8+ consecutive scheduled days with completed sessions), then write the matching `workout_streak` row per Step 1.
2. Open `/` and note the number in the flame pill.
3. Open `/stats` and note "Sequência Atual".

**Expect**: identical numbers. Before this change Home showed at most 7 while Stats showed the true value.

---

## Step 4 — Record updates on a new best (FR-012, SC-004)

1. Set up an account where `current_streak == longest_streak` (say both 3).
2. Complete today's workout through the UI (`/workout-plans/…/days/…` → complete).
3. Reload `/stats`.

**Expect**: both current streak and record now read 4.

Then confirm the record does **not** move when below it: set `current_streak = 2, longest_streak = 10`, complete a workout, reload. Current becomes 3; record stays 10.

---

## Step 5 — Same-day idempotency (FR-007)

With a workout already completed today, complete a second session on the same day.

**Expect**: neither `current_streak` nor `longest_streak` changes. Confirm in the DB, not just the UI.

---

## Step 6 — Expiry on read, no background job (FR-009, FR-013, FR-014, FR-015, SC-005)

1. Seed a streak ending on a scheduled day at least two days ago, so a scheduled day has fully elapsed unworked.
2. Set `last_workout_day` accordingly and `current_streak` to a non-zero value, simulating stale state.
3. Open `/stats`.

**Expect**: current streak displays 0; `longest_streak` is **unchanged** (FR-015); the corrected value is persisted — re-query the row and confirm `current_streak = 0` on disk, not merely in the response.

**Also expect**: no cron, scheduler, or background worker was involved (FR-013). The correction happened on the read.

Then confirm today does not break a streak (FR-008): with `last_workout_day = yesterday` and today scheduled but unworked, `/stats` must still show the streak intact.

---

## Step 7 — Rest days do not break the streak (FR-008, FR-008a)

Using a plan with at least one `is_rest = true` weekday, seed completed sessions on consecutive **scheduled** days spanning that rest day.

**Expect**: the streak counts through the rest day rather than resetting.

Then create a second plan with different rest days (the AI coach's `createWorkoutPlan` tool or `/onboarding` both work) and re-seed the `workout_streak` row per Step 1. **Expect**: past continuity is unchanged — the old plan still governs the days it was active on (FR-008a). A plan change must not retroactively rewrite history.

---

## Step 8 — Atomicity (FR-012a)

Temporarily force the streak update to throw (a thrown error inside the transaction, removed immediately after), then complete a workout through the UI.

**Expect**: the request fails, **and** `workout_session.completed_at` remains `NULL` — the completion rolled back with the streak update. A completed session with an un-incremented streak is the failure this prevents.

Remove the forced error and confirm the same completion now succeeds.

---

## Step 9 — Backdated completion (FR-012b)

The subtle one.

1. Insert a session started 4 days ago with `completed_at = NULL`, on a scheduled day.
2. Arrange history so the streak has since reset (a later scheduled day elapsed unworked). Write the matching `workout_streak` row per Step 1 with `current_streak = 0`; note the current `longest_streak`.
3. Now complete that stale session via `PATCH …/sessions/<id>/complete`.

**Expect**: the state is rebuilt rather than incremented. `longest_streak` rises if the newly-filled day completes a longer past run than previously recorded. It must never *decrease*.

This is the case a naive forward-only increment gets wrong, silently understating the record forever.

---

## Step 10 — Read cost (SC-003)

With an account carrying a long history (seed a few hundred completed sessions), load `/` and `/stats`.

**Expect**: streak retrieval is a single-row lookup — no session scan on either request. Confirm via the query log; response times stay within the < 200ms p95 budget and do not grow with history size.

---

## Final checks

- [ ] `cd packages/backend && npm run lint` clean
- [ ] `cd packages/backend && npm run build` clean
- [ ] `cd packages/web && npm run lint` clean
- [ ] `cd packages/web && npm run build` clean
- [ ] `/docs` shows `workoutStreakRecord` on the stats response
- [ ] No console errors or failed network requests on `/` or `/stats`
- [ ] `CalcStreak.ts` deleted and no imports of it remain
- [ ] No automated test files were added anywhere (Constitution I)
