# Quickstart & Manual Validation: Today's Workout Screen

Per the constitution, verification is **manual only**. This guide lists the
runnable steps and the scenarios that prove the feature end-to-end. It is a
run/validate guide — implementation code lives in the codebase and `tasks.md`.

## Prerequisites

- Node v24.14.0 (`.nvmrc`), `npm install` at repo root.
- Postgres running: `cd packages/backend && docker compose up -d`.
- Migrations applied: `npx prisma migrate dev`.
- A user who completed onboarding with an **active plan** that has a workout day
  matching **today's weekday** and at least one non-rest day with exercises.
- `.env` present in both packages (`cp .env.example .env`).

## Setup / run

```bash
# 1. Backend (contract source of truth) — apply the schema change first
cd packages/backend && npm run dev        # port 3333, docs at /docs

# 2. Regenerate the typed web client after the backend schema change
cd packages/web && npx orval              # backend must be running

# 3. Web app
cd packages/web && npm run dev            # port 3000

# 4. Add the toast dependency (one-time)
cd packages/web && npm install sonner
```

Also run before marking done: `npm run lint` in both packages, and
`npm run build` in `packages/web`.

## Contract check (API docs)

1. Open `http://localhost:3333/docs`.
2. Call `GET /:workoutPlanId/days/:workoutDayId` for today's day and confirm the
   response now includes a `session` field (`null`, or an object with `id`,
   `startedAt`, and nullable `completedAt`). See `contracts/get-workout-day.md`.

## Validation scenarios (UI — chrome-devtools MCP, at 320px and 1280px)

### S1 — Navigate & view (US1, FR-001/002)
- From the home screen, tap the "Treino de Hoje" card.
- **Expect**: the workout screen opens showing day name, cover image, estimated
  duration, and the ordered exercise list (sets/reps/rest) matching Figma
  `3606-679`. Back "<" returns to home; "?" buttons do nothing.

### S2 — Start (US2, FR-004/007/009/010)
- With **no** session for today, load the screen.
- **Expect**: "Iniciar treino" card pinned at top (not overlapping header); no
  "Marcar como concluído" bar. Scroll → card stays pinned. Tap "Iniciar treino".
- **Expect**: success toast; screen switches to in-progress (bottom bar appears,
  top start action gone). Matches Figma `3606-833` / `3606-815`.

### S3 — Complete (US3, FR-005/006/008/011)
- With an in-progress session, load the screen.
- **Expect**: "Marcar como concluído" bar pinned at bottom, above the bottom nav
  (no overlap). Scroll → bar stays pinned. Tap it.
- **Expect**: success toast; bar disappears; "Finalizado!" success badge shows
  where the start action was. Matches Figma `3606-790`.

### S4 — Completed on reload (US3 scenario 5, FR-006)
- Re-open the screen for the just-completed day.
- **Expect**: "Finalizado!" badge shown; neither action control present.

### S5 — Already-started reconciliation (FR-018)
- Trigger a start when a session already exists (e.g., start in one tab, then tap
  start in a stale tab).
- **Expect**: informational toast; screen reconciles to the true state (in
  progress or completed); no blocking error.

### S6 — Invalid / rest-day guard (US4, FR-014)
- Visit the URL directly with a non-existent plan/day → redirected to `/`.
- Visit for a day where `isRest = true` → redirected to `/`.
- Visit while logged out → redirected to `/login` (proxy).

### S7 — Robustness (FR-016/017)
- Rapidly double-tap "Iniciar treino" / "Marcar como concluído".
- **Expect**: exactly one request and one toast; control disabled while pending.
- Verify no console errors and no failed network requests at 320px and 1280px.

## Done criteria

- All scenarios pass at both widths; rendered UI matches the referenced Figma
  nodes; lint and web build pass; no hand-edits to generated files.
