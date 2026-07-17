# Phase 1 Data Model: Workout Plan Screen

**No database migration.** No Prisma model, field, or enum changes. This feature reads
existing data through a new query path.

## Existing entities (read-only here)

### WorkoutPlan (`prisma/schema.prisma:49-60`)

| Field | Type | Role in this feature |
|---|---|---|
| `id` | uuid | Builds day links (`/workout-plans/:id/days/:dayId`) |
| `name` | String | **The badge copy** (FR-005) |
| `userId` | String | Ownership filter |
| `isActive` | Boolean | **The selector** — `/active` returns the row where this is true |
| `workoutDays` | WorkoutDay[] | The week list |

Domain rule (already enforced by `CreateWorkoutPlan`): exactly one active plan per
user; creating a plan deactivates the previous one. `/active` depends on this
invariant — it selects the single `isActive: true` row.

### WorkoutDay (`prisma/schema.prisma:62+`)

| Field | Type | Role in this feature |
|---|---|---|
| `id` | uuid | Day link target |
| `name` | String | Card title ("Inferiores") |
| `weekDay` | WeekDay | Badge label + **sort key** |
| `isRest` | Boolean | Selects rest card vs. training card; rest cards are inert |
| `coverImageUrl` | String? | Training card background |
| `estimatedDurationInSeconds` | Int | Rendered as minutes |
| `exercises` | WorkoutExercise[] | **Counted only** — never fetched in full |

## Derived / computed values

### `exercisesCount`

Produced by Prisma `_count`, not by loading exercises — the pattern already used in
`GetWorkoutPlan.ts:12-19`. Avoids an N+1 and keeps the payload lean (Principle VI).

### Week order (the trap)

`enum WeekDay` (`schema.prisma:39-47`) is declared **`SUNDAY` first**:

```text
SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY
```

PostgreSQL orders enums by declaration order, so `orderBy: { weekDay: 'asc' }` yields
**Sunday → Saturday**, which violates FR-007. The use-case therefore sorts explicitly
against a canonical constant:

```text
WEEK_ORDER = [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY]
```

Sorting 7 in-memory rows by index in this array. See research.md §1 for the rejected
alternatives (enum reordering, `order` column, frontend sort).

### Header title (frontend, derived)

Pure function of the origin marker and the day's `weekDay` — no persistence:

```text
from === 'home'  →  "Treino de Hoje"
otherwise        →  WEEKDAY_LABELS[weekDay]   // e.g. "Segunda"
```

## Frontend shared constant

`WEEKDAY_LABELS: Record<WeekDay, string>` moves out of `workout-day-card.tsx:14-22`
into a shared module, with values restated in **title case**:

| weekDay | Value | Card renders (CSS `uppercase`) | Header renders |
|---|---|---|---|
| MONDAY | `Segunda` | SEGUNDA | Segunda |
| TUESDAY | `Terça` | TERÇA | Terça |
| WEDNESDAY | `Quarta` | QUARTA | Quarta |
| THURSDAY | `Quinta` | QUINTA | Quinta |
| FRIDAY | `Sexta` | SEXTA | Sexta |
| SATURDAY | `Sábado` | SÁBADO | Sábado |
| SUNDAY | `Domingo` | DOMINGO | Domingo |

One constant serves both surfaces because the card already uppercases in CSS
(`workout-day-card.tsx:68`). The card's rendered output is unchanged by this move.

## State transitions

None. This feature is read-only: no entity changes state. Session start/complete
transitions remain owned by feature 002's day screen, untouched here.
