# Phase 1 API Contracts: Recorde de Sequência de Treinos

**Feature**: [spec.md](./spec.md) | **Date**: 2026-08-03

Backend is the single source of truth for API shapes (Constitution, Cross-package contracts). Every change below is made in `packages/backend` first, then propagated with `cd packages/web && npx orval` while the backend is running.

---

## 1. `GET /api/stats` — one field added

**File**: `packages/backend/src/dtos/GetStatsResponse.ts`

```diff
 export const GetStatsResponse = z.object({
   completedWorkoutsCount: z.number(),
   conclusionRate: z.number(),
   consistencyByDay: z.record(
     z.iso.date(),
     z.object({
       workoutDayCompleted: z.boolean(),
       workoutDayStarted: z.boolean(),
     }),
   ),
   totalTimeInSeconds: z.number(),
   workoutStreak: z.number(),
+  workoutStreakRecord: z.number(),
 });
```

| Field | Type | Meaning |
|---|---|---|
| `workoutStreak` | `number` | Current streak. **Unchanged name and type**; its *value* now comes from the materialized state and is no longer truncated at ~180 days (FR-019 correction #2). |
| `workoutStreakRecord` | `number` | All-time longest streak. `0` means the user has never completed a workout — the client still renders the badge as `RECORDE: 0 DIAS` (FR-004). |

**Additive and non-breaking.** Existing consumers keep working; the field is required rather than optional because the server can always supply it (0 when absent).

Keys stay alphabetically sorted — `eslint-plugin-perfectionist` is configured in this package and will otherwise flag the object.

---

## 2. `GET /api/home` — shape unchanged, value corrected

**File**: `packages/backend/src/schemas/HomeSchema.ts` — **no edit required.**

`workoutStreak: z.number()` already exists and keeps its name and type. What changes is behind it: `GetHomeData` stops calling `CalcWorkoutStreak` with a week-bounded window and reads the shared materialized state instead (FR-020).

**This is a silent value change, not a shape change.** Home currently caps the streak at the days elapsed in the current week (max 7); it will now report the true streak. A user on a 40-day streak goes from `7` to `40`. Orval regeneration produces no diff for this endpoint — which is exactly why it needs calling out here rather than being left to be discovered in review.

`workoutStreakRecord` is deliberately **not** added to the Home contract: the badge is scoped to Stats (spec Clarifications), and Constitution VI requires payloads to carry only fields the client consumes.

---

## 3. `PATCH /api/workout-plans/:workoutPlanId/days/:workoutDayId/sessions/:sessionId/complete`

**Request and response shapes: unchanged.** No DTO edit.

Behavioral change only, inside `CompleteWorkoutSession`:

- The session update and the streak-state update now commit inside one interactive transaction (FR-012a).
- A failure updating the streak **fails the whole request** and the completion is not persisted. Callers that previously could only see a `404` may now also see a `500`; the client retries by re-issuing the same completion, which is safe because the operation is idempotent per day (FR-007).

No new error code is introduced — a streak-update failure is an infrastructure failure, not a domain error, and the existing error handler covers it.

---

## 4. Orval regeneration

After the backend change, with the backend running:

```bash
cd packages/web && npx orval
```

Regenerated output lands in `packages/web/src/lib/api/fetch-generated/` and `packages/web/src/lib/api/schemas/`. Both are **generated — never hand-edited** (Constitution II).

Expected diff: `workoutStreakRecord` appears on the stats response type. The home response type is untouched.

---

## 5. Consuming change (web)

`packages/web/src/app/(protected)/(main)/stats/page.tsx` destructures the new field from `stats.data` and passes it to `StreakBanner`:

```tsx
<StreakBanner record={workoutStreakRecord} streak={workoutStreak} />
```

`StreakBanner` renders the badge unconditionally, including at `record === 0` (FR-004). No parallel DTO is defined on the frontend; the generated type is used directly.

---

## Contract checklist

- [ ] `GetStatsResponse` gains `workoutStreakRecord`, keys alphabetically sorted
- [ ] `HomeSchema` untouched — confirm no accidental edit
- [ ] Backend running, `npx orval` executed from `packages/web`
- [ ] Generated files not hand-edited
- [ ] `/docs` (Scalar) shows the new field on the stats response
- [ ] Stats page consumes the generated type, defines no local DTO
