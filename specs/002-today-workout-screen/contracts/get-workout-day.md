# API Contracts: Today's Workout Screen

Backend is the single source of truth. After the schema change below, regenerate
the web client: start the backend, then `cd packages/web && npx orval`.

## 1. GET `/:workoutPlanId/days/:workoutDayId` — CHANGED (additive)

Fetches the workout day. **Change**: add a nullable `session` field so the client
can derive session state and obtain the `sessionId` for completion.

**Params**: `workoutPlanId: uuid`, `workoutDayId: uuid`

**200 response** (`WorkoutDaySchema`, additive change in **bold**):

```jsonc
{
  "id": "uuid",
  "name": "Peito e Tríceps",
  "weekDay": "MONDAY",
  "isRest": false,
  "coverImageUrl": "https://…" ,          // or null
  "estimatedDurationInSeconds": 3600,
  "exercises": [
    { "id": "uuid", "name": "Supino", "order": 0, "sets": 4, "reps": 12, "restTimeInSeconds": 60 }
  ],
  "session": {                            // NEW — null when no session exists
    "id": "uuid",
    "startedAt": "2026-07-14T10:00:00.000Z",
    "completedAt": null                   // ISO datetime string, or null while in progress
  }
}
```

**Schema definition** (add to `packages/backend/src/schemas/WorkoutDaySchema.ts`):

```ts
session: z
  .object({
    id: z.uuid(),
    startedAt: z.iso.datetime(),
    completedAt: z.iso.datetime().nullable(),
  })
  .nullable()
  .meta({ description: "Sessão atual do dia (null se não iniciada)" }),
```

**Use-case mapping** (`GetWorkoutDay.execute()`): return the day with
`session` derived from `sessions[0]`, converting dates to ISO strings and
`completedAt` preserving `null`; the raw `sessions` array is dropped by
serialization.

**Errors**: `401`, `404`, `500` (unchanged).

## 2. POST `/:workoutPlanId/days/:workoutDayId/sessions` — UNCHANGED

Starts a session for the day. Reused as-is.

- **201** → `{ "id": "uuid" }` (new session id)
- **409** → `{ "code": "SESSION_ALREADY_STARTED_ERROR", "error": "…" }` → client
  reconciles (informational toast + refresh), per FR-018
- Errors: `401`, `404`, `422`, `500`

## 3. PATCH `/:workoutPlanId/days/:workoutDayId/sessions/:sessionId/complete` — UNCHANGED

Marks the session complete. Reused as-is.

- **200** → `{ "id": "uuid", "startedAt": "…", "completedAt": "…" }`
- Errors: `401`, `404`, `500`

## Frontend Server Action contracts (new, internal)

`app/(main)/workout-plans/[workoutPlanId]/days/[workoutDayId]/actions.ts`:

```ts
'use server'
startWorkoutSessionAction(input: { workoutPlanId: string; workoutDayId: string })
  : Promise<{ ok: true; sessionId: string }
          | { ok: false; conflict: true }
          | { ok: false; conflict?: false }>

completeWorkoutSessionAction(input: { workoutPlanId: string; workoutDayId: string; sessionId: string })
  : Promise<{ ok: true } | { ok: false }>
```

Each wraps the corresponding generated client function. The client island maps
results to sonner toasts and calls `router.refresh()` on success/conflict so the
server re-derives state.
