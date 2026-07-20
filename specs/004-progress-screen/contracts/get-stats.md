# Consumed Contract: `GET /api/stats` (existing — no changes)

This feature consumes an already-implemented endpoint. It is documented here for
reference only; **no backend or Orval changes are part of this feature**.

- **Backend route**: `packages/backend/src/routes/stats.routes.ts` (mounted with
  prefix `/stats` in `routes/index.ts`).
- **Use-case**: `packages/backend/src/use-cases/stats/GetStats.ts`.
- **Response DTO**: `packages/backend/src/dtos/GetStatsResponse.ts`.
- **Generated web client**: `getApiStats(params)` in
  `packages/web/src/lib/api/fetch-generated/index.ts`.

## Request

```
GET /api/stats?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>
```

Auth: session cookie (better-auth), forwarded by `customFetch`. Both query params
are required ISO dates. For this screen: `from` = Sunday six months ago (week
start), `to` = current week's Saturday.

## Responses

| Status | Shape | Screen handling |
|--------|-------|-----------------|
| `200` | `{ workoutStreak, completedWorkoutsCount, conclusionRate (0–1), totalTimeInSeconds, consistencyByDay: Record<YYYY-MM-DD, { workoutDayStarted, workoutDayCompleted }> }` | Render banner + grid + metrics |
| `401` | `{ error, code }` | Handled upstream by route protection (`proxy.ts`) → login |
| `404` | `{ error, code }` (no active plan) | `redirect('/onboarding')` |
| `500` | `{ error, code }` | Surfaces as an error (framework default); not a happy-path concern |

## Consumer expectations (verify manually, do not change backend)

- `conclusionRate` is a 0–1 fraction (multiply by 100 for display).
- `totalTimeInSeconds` sums only completed sessions.
- Dates absent from `consistencyByDay` mean "no training that day".
- `workoutStreak` already excludes rest days.
