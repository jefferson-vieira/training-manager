# Quickstart: Workout Plan Screen — Manual Validation

Per constitution Principle I there are **no automated tests**. This is the manual
verification script. Every step maps to a spec requirement.

## Prerequisites

```bash
# repo root
npm install

# backend
cd packages/backend
docker compose up -d          # Postgres
npx prisma migrate dev        # no new migration in this feature — just ensure schema is applied
npm run dev                   # :3333, docs at /docs

# web (separate terminal)
cd packages/web
npm run dev                   # :3000
```

Both packages need a `.env` (`cp .env.example .env`).

## Step 1 — Verify the endpoint before touching the UI

With the backend running, exercise `GET /workout-plans/active` from `/docs`
(authenticated as a user **with** an active plan).

Confirm:

- **200** with `name` set and `workoutDays.length === 7`.
- `workoutDays[0].weekDay === "MONDAY"` and `workoutDays[6].weekDay === "SUNDAY"`.
  > This is the assertion that matters most. The `WeekDay` enum is declared
  > **Sunday-first** (`schema.prisma:39-47`), so if the explicit sort is missing or
  > wrong you will see `SUNDAY` at index 0 — with a plausible-looking week that is
  > simply rotated. It renders without error; only this check catches it.
- Days carry `exercisesCount` (a number) and **no** `exercises` array.
- Rest days: `isRest: true`, `estimatedDurationInSeconds: 0`, `exercisesCount: 0`.

Then, as a user **without** an active plan: expect **404** (not 200-with-null, not 500).

## Step 2 — Regenerate the typed client

```bash
# backend must be running
cd packages/web && npx orval
```

Confirm `getActiveWorkoutPlan` now exists in `src/lib/api/fetch-generated/`.
Never hand-edit that directory.

## Step 3 — The plan screen (FR-004 … FR-009)

Sign in as a user with an active plan, then click the **Calendar** icon in the bottom
navigation.

| Check | Expected | Req |
|---|---|---|
| Destination | `/workout-plan` | FR-001 |
| Calendar icon | Rendered in its active/primary colour | FR-002 |
| Badge | The **plan's real name** (not hardcoded "Hipertrofia & Força") | FR-005 |
| Title | "Plano de Treino" + banner | FR-006 |
| Day order | Segunda → Domingo, top to bottom | FR-007 |
| Training cards | Cover image, name, `45min`, `4 exercícios` | FR-008 |
| Rest cards | Compact, "Descanso" + zap icon, **no** duration/count | FR-009 |
| Rest card tap | Nothing happens | FR-009 |
| Bottom nav | Not overlapped; last card fully scrollable into view | FR-019 |

Also from home: tap **"Ver treinos"** → same screen (FR-012).

## Step 4 — The header title rule (FR-013)

This is the regression-prone part. All four paths must be checked:

| Path | Expected header |
|---|---|
| Home → "Treino de Hoje" card | **Treino de Hoje** |
| Plan screen → Monday's card | **Segunda** |
| Plan screen → *today's* card | **its weekday label** (origin decides, not the date) |
| Paste day URL directly (no `?from=home`) | **its weekday label** |

Then confirm on a plan-originated day screen:

- Back "<" returns to the plan screen (FR-013 / US2-4).
- **Start/complete session still works exactly as before** (FR-015) — this is the
  shipped feature-002 flow and the main regression risk of this change.

## Step 5 — The guard (FR-011)

As a user **without** an active plan (or after deactivating it in Prisma Studio):

- Visit `/workout-plan` → redirected to `/onboarding`, with the plan screen never
  painting first.
- Signed out, visit `/workout-plan` → redirected to `/login` (FR-014).

## Step 6 — Responsive + console (FR-018, mandatory UI validation)

Using the **chrome-devtools MCP**, at **320px** and **1280px**:

- Screenshot `/workout-plan`; compare against Figma node `3606-79`.
- Screenshot a plan-originated day header; compare against node `3606-810`.
- No horizontal scroll, no clipped cards, no overlap of the bottom nav.
- Touch targets ≥ 44×44px.
- Console clean; no failed network requests.

A UI task is not done until the rendered screen matches the prototype.

## Regression checklist (things this feature must not break)

- Home screen renders unchanged; "Ver histórico" stays inert (out of scope).
- `WorkoutDayCard` on **home** looks identical — `WEEKDAY_LABELS` moved to title case,
  but the card applies `uppercase` in CSS, so `SEGUNDA` must still render on the card.
- `GET /workout-plans/:workoutPlanId` behaviour unchanged for existing consumers.
