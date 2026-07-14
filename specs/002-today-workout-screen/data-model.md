# Phase 1 Data Model: Today's Workout Screen

No database migration. This feature only **exposes** existing persisted data and
derives UI state from it. Prisma models (`WorkoutDay`, `WorkoutExercise`,
`WorkoutSession`) are unchanged.

## Entities

### WorkoutDay (existing, response extended)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| name | string | e.g. "Peito e Tríceps" |
| weekDay | WeekDay enum | Mon–Sun |
| isRest | boolean | if `true`, screen redirects to home |
| coverImageUrl | string \| null | superior/inferior cover |
| estimatedDurationInSeconds | number ≥ 0 | 0 for rest |
| exercises | WorkoutExercise[] | ordered by `order` asc |
| **session** | **WorkoutDaySession \| null** | **NEW** — the day's current session (0 or 1) |

Relationship: a `WorkoutDay` belongs to a `WorkoutPlan` and has 0..1 relevant
`WorkoutSession` (Start blocks a second session per day).

### WorkoutExercise (existing, unchanged)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| name | string | |
| order | number ≥ 0 | display order |
| sets | number ≥ 1 | |
| reps | number ≥ 1 | |
| restTimeInSeconds | number ≥ 1 | between sets |

### WorkoutDaySession (NEW nested shape on the day response)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | needed by the complete endpoint |
| startedAt | ISO datetime string | when the session began |
| completedAt | ISO datetime string \| null | `null` while in progress |

Source: `WorkoutSession` Prisma model (`started_at`, `completed_at` nullable).
Mapped in `GetWorkoutDay` from `sessions[0]` with `.toISOString()` conversion.

## Derived UI State (frontend, not persisted)

| State | Condition | Controls shown |
|-------|-----------|----------------|
| NOT_STARTED | `session == null` | Top pinned "Iniciar treino" card; bottom bar hidden |
| IN_PROGRESS | `session != null && session.completedAt == null` | Bottom pinned "Marcar como concluído" bar; top button hidden |
| COMPLETED | `session != null && session.completedAt != null` | "Finalizado!" success badge in the start-action slot; both controls hidden |

## State Transitions

```text
NOT_STARTED --[POST sessions → 201]--> IN_PROGRESS --[PATCH .../complete → 200]--> COMPLETED
     |
     └─[POST sessions → 409 SESSION_ALREADY_STARTED_ERROR]─> reconcile via refresh
                                                             (→ IN_PROGRESS or COMPLETED)
```

- Transitions are confirmed by re-fetching the server component (`router.refresh()`),
  so the rendered state always reflects the backend, not optimistic client guesses.
- Guard: if the resolved day `isRest` or the fetch is non-200, the screen never
  renders — the user is redirected to `/`.
