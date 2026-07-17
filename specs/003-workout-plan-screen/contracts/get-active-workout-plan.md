# API Contracts: Workout Plan Screen

Backend is the single source of truth. After the change below, regenerate the web
client: start the backend, then `cd packages/web && npx orval`.

## 1. GET `/workout-plans/active` — NEW

Returns the requesting user's **active** workout plan, or 404 when they have none.
Supersedes `GET /workout-plans/:workoutPlanId` *for this screen only* (see spec
Clarifications); that endpoint is unchanged for its existing consumers.

**Naming**: `active` — not `current` — deliberately reuses the word the codebase already
uses for this concept (`is_active`, `activeWorkoutPlanId`, `?isActive=true`), so
`getActiveWorkoutPlan` reads as the singular of `getWorkoutPlans({ isActive: true })`.
See research.md §2 (supersedes the `/current` naming in the 2026-07-15 clarification).

**Params**: none. **Querystring**: none.

**Route placement** (`packages/backend/src/routes/workout-plan.routes.ts`): registered
under the existing `/workout-plans` prefix (`routes/index.ts:13`). Fastify's router
matches static segments before parametric ones, so `/active` takes priority over
`/:workoutPlanId` regardless of declaration position. Declaring it adjacent to the
other `GET`s keeps the file readable.

**200 response** — reuses the existing `GetWorkoutPlanResponse` DTO unchanged:

```jsonc
{
  "id": "uuid",
  "name": "Hipertrofia & Força",       // -> the badge (FR-005)
  "userId": "uuid",
  "workoutDays": [                      // exactly 7, MONDAY -> SUNDAY (FR-007)
    {
      "id": "uuid",
      "name": "Inferiores",
      "weekDay": "MONDAY",
      "isRest": false,
      "coverImageUrl": "https://…",     // or null
      "estimatedDurationInSeconds": 2700,
      "exercisesCount": 4               // count only — no exercise bodies
    },
    {
      "id": "uuid",
      "name": "Descanso",
      "weekDay": "WEDNESDAY",
      "isRest": true,
      "coverImageUrl": null,
      "estimatedDurationInSeconds": 0,
      "exercisesCount": 0
    }
  ]
}
```

**Ordering guarantee**: `workoutDays` arrives Monday→Sunday. This is a **contract
promise**, and it is not free — `enum WeekDay` is declared Sunday-first
(`schema.prisma:39-47`), so `orderBy: { weekDay: 'asc' }` would return Sunday first.
The use-case sorts explicitly (see data-model.md).

**Errors**:

- `401` — no session (`getSession` handles, as in sibling routes)
- `404` — user has no active plan → **client redirects to `/onboarding`** (FR-011)
- `500`

**Schema wiring** (mirrors the existing `GET /:workoutPlanId` route):

```ts
schema: {
  operationId: 'getActiveWorkoutPlan',   // -> orval fn name `getActiveWorkoutPlan`
  response: {
    200: GetWorkoutPlanResponse,
    401: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
  summary: 'Get the active workout plan',
  tags: ['Workout Plan'],
}
```

**Use-case** (`packages/backend/src/use-cases/workout-plan/GetActiveWorkoutPlan.ts`):

```text
execute({ userId }):
  findFirst workoutPlan where { userId, isActive: true }
    include workoutDays with _count.exercises
  if none -> throw NotFoundError('Active workout plan not found')   // -> 404
  map days -> { ...day, exercisesCount: _count.exercises }
  sort days by WEEK_ORDER index (MONDAY..SUNDAY)
  return plan
```

Mirrors `GetWorkoutPlan.ts` (same `_count` include, same `NotFoundError`), differing
only in selector (`isActive` instead of `id`) and the explicit sort.

## 2. GET `/workout-plans/:workoutPlanId` — UNCHANGED

Not used by this screen. Left intact for existing consumers.

## 3. GET `/workout-plans/:workoutPlanId/days/:workoutDayId` — UNCHANGED

The day screen's endpoint, reused exactly as feature 002 left it. This feature changes
only the day screen's **header title**, which is derived on the client from a query
parameter — no API involvement.

## Frontend contracts (no server actions needed)

This feature is read-only; no mutations, so no `actions.ts`.

**Plan page** — `app/(main)/workout-plan/page.tsx` (Server Component):

```text
getActiveWorkoutPlan()
  status 200 -> render banner + badge(name) + 7 day cards
  otherwise  -> redirect('/onboarding')      // FR-011
```

Follows the established pattern of calling the generated client directly from a Server
Component and redirecting on non-200 (`(home)/page.tsx:16-18`,
`days/[workoutDayId]/page.tsx:25-27`).

**Day page origin marker** — `/workout-plans/:planId/days/:dayId?from=home`:

```text
searchParams.from === 'home' -> title = 'Treino de Hoje'
otherwise                    -> title = WEEKDAY_LABELS[day.weekDay]
```

Only the home link carries `?from=home`; plan-screen links stay bare, so bare and
deep-linked URLs fall back to the weekday label (FR-013).
