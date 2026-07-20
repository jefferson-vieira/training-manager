# Quickstart: Manual Validation — Progress Screen

Per constitution Principle I, verification is **manual only**. Use chrome-devtools
MCP at mobile (320px) and desktop (1280px+) widths.

## Prerequisites

```bash
# from repo root
docker compose up -d                     # Postgres
cd packages/backend && npm run dev       # API on :3333 (docs at /docs)
cd packages/web && npm run dev           # Web on :3000
```

Sign in as a user who has an **active workout plan** with some started/completed
sessions across recent weeks (seed or exercise flows via the app if needed).

## Navigation

1. From any main screen, tap the **chart** icon (chart-no-axes-column) in the
   bottom nav → lands on `/stats`.
2. Confirm the shared **logo header** renders (same as profile screen).

## Scenarios

### 1. Summary metrics (FR-004, 006, 007, 008)

- [ ] Streak value matches `workoutStreak` from `GET /api/stats`.
- [ ] Completed workouts = `completedWorkoutsCount`.
- [ ] Completion rate shown as a percentage (e.g. `83%`).
- [ ] Total time shown as `NNhNNm` (e.g. `115h40m`); verify a value > 99 h formats correctly.

### 2. Streak banner variant (FR-005)

- [ ] Streak > 0 (1 or more) → **colored** banner (matches Figma `3606-216`).
- [ ] Streak 0 → **neutral** banner (matches Figma `3606-414`).

### 3. Consistency grid (FR-009–FR-012)

- [ ] Rows are weekdays Sunday (top) → Saturday (bottom).
- [ ] Columns are consecutive full weeks covering ~6 months (~26 columns).
- [ ] Completed day = blue, started-only = light blue, untrained/rest/out-of-range = white.
- [ ] Month label appears only on the first column of each month; later columns of
      the same month have no label.
- [ ] Grid scrolls horizontally within its container at 320px without breaking page layout.

### 4. Day tooltip (FR-013)

- [ ] Hovering a cell (desktop) shows `DD/MM`.
- [ ] Tapping a cell (mobile emulation) shows the same `DD/MM`.

### 5. No active plan (FR-015)

- [ ] As a user with **no active plan**, opening `/stats` redirects to `/onboarding`.

### 6. Empty period

- [ ] Active plan, zero sessions in range → all-white grid, metrics `0` / `0%` /
      `0h00m`, neutral streak banner.

## Fidelity & health checks

- [ ] Compare rendered screen against Figma frame `3606-212`; reconcile spacing,
      typography, and colors until matched.
- [ ] No console errors; no failed network requests (only the one `GET /api/stats`).
- [ ] Touch targets (nav icon, interactive cells) ≥ 44×44px.
