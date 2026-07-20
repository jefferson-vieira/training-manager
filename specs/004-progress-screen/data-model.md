# Phase 1 Data Model: Progress Screen

This feature introduces **no persistence changes**. It derives a client view model
from the existing `GetApiStats200` response. Types below reference the generated
client (`packages/web/src/lib/api/fetch-generated/index.ts`) — do not redefine them.

## Source entity (existing) — `GetApiStats200`

| Field | Type | Meaning | Used by |
|-------|------|---------|---------|
| `workoutStreak` | `number` | Consecutive completed training days (rest days skipped, not counted) | Streak banner |
| `completedWorkoutsCount` | `number` | Count of completed sessions in range | Metric: treinos feitos |
| `conclusionRate` | `number` (0–1) | completed ÷ started | Metric: taxa de conclusão (× 100 → %) |
| `totalTimeInSeconds` | `number` | Sum of completed session durations | Metric: tempo total (→ `NNhNNm`) |
| `consistencyByDay` | `Record<YYYY-MM-DD, { workoutDayStarted: boolean; workoutDayCompleted: boolean }>` | Per-day status; absent date = no training | Consistency grid |

## Query parameters — `GetApiStatsParams`

| Field | Type | Value for this screen |
|-------|------|-----------------------|
| `from` | `YYYY-MM-DD` | Sunday of the week six months before today |
| `to` | `YYYY-MM-DD` | Saturday of the current week |

## Derived view model (client-only, not persisted)

### `DayCellStatus` (per grid cell)

Derived from `consistencyByDay[date]`:

| Condition | Cell appearance |
|-----------|-----------------|
| `workoutDayCompleted === true` | blue (`bg-primary`) |
| `workoutDayStarted === true && !completed` | light blue (`bg-primary/20`) |
| date absent, or day is a rest day, or out of range | white (bordered) |

> Rest days are indistinguishable from untrained days at the view layer (both
> white) — the API already excludes rest days from streak counting. No client-side
> rest-day flag is needed.

### `WeekColumn`

- `days: Dayjs[7]` — Sunday..Saturday for that ISO-week slot.
- `monthLabel: string | null` — the localized month label **only** when this column
  is the first column whose in-range days belong to a month not shown by the
  previous column; otherwise `null`.

### `StreakVariant`

- `colored` when `workoutStreak > 0` (1 or more).
- `neutral` when `workoutStreak === 0`.

## Validation & rules (from spec)

- **FR-005**: streak variant boundary at 1 — colored when streak > 0, neutral at 0.
- **FR-009 / FR-012**: full Sun–Sat week columns; month label once per month on its
  first column.
- **FR-010 / FR-011**: cell color mapping above; rest/untrained/out-of-range all white.
- **FR-007 / FR-008**: `conclusionRate` shown as percent; `totalTimeInSeconds` shown
  as `NNhNNm` supporting > 99 h.
- **FR-013**: each cell exposes `DD/MM` via tooltip on hover and tap.

## Empty / error states

- Stats `404` (no active plan) → `redirect('/onboarding')` (page level, before render).
- Active plan with zero sessions → grid all-white, metrics `0` / `0%` / `0h00m`,
  streak variant `neutral`.
