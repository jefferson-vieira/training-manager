# Quickstart & Manual Validation: User Profile Screen

Manual validation only (Constitution Principle I — no automated tests). Use the
chrome-devtools MCP per `CLAUDE.md` UI validation rules.

## Prerequisites

```bash
# from repo root
npm install
cd packages/backend && docker compose up -d && npx prisma migrate dev
npm run dev            # backend on :3333, docs at /docs
# new terminal
cd packages/web && npm run dev   # web on :3000
```

Ensure both packages have a `.env` (`cp .env.example .env`). No Orval regeneration is
needed — `GET /me` already exists in the generated client.

## Accounts / data setup

- **User with profile**: log in and complete onboarding so a `UserProfile` row
  exists (verify `GET /me` returns 200 at `http://localhost:3333/docs`).
- **User without profile**: a freshly created account that has not completed
  onboarding (verify `GET /me` returns 404).

## Validation scenarios

### 1. View profile (FR-002–FR-007, US1)

1. Log in as the user **with** a profile.
2. Navigate to `/profile`.
3. Expect: weight (kg), height, body fat (%), and age (years) shown with labels and
   correct human-readable units; values match onboarding data (`/docs` `GET /me`).
4. Expect: no editable fields / inputs (read-only).

### 2. Bottom-nav entry point + active state (FR-008/FR-009, US2)

1. From `/`, tap the `UserRound` icon in the bottom navigation.
2. Expect: navigates to `/profile`.
3. Expect: on `/profile`, the profile nav item shows the active indication; from
   `/`, the home item is active.

### 3. Logout (FR-010–FR-012, US3)

1. On `/profile`, tap "Sair da conta".
2. Expect: session ends and the app navigates to `/login`.
3. Attempt to open `/` or `/profile` directly.
4. Expect: redirected to `/login` (proxy blocks protected routes).

### 4. No profile → onboarding redirect (FR-013, clarification)

1. Log in as the user **without** a profile.
2. Navigate to `/profile`.
3. Expect: immediately redirected to `/onboarding`; the empty profile screen is
   never shown.

### 5. Missing individual value (FR-014, defensive)

1. With a 200 response where a value is absent (simulate via mocked response if
   needed), open `/profile`.
2. Expect: a clear placeholder ("—") for that value, not a blank/broken row.

### 6. Responsive (FR-015, SC-005)

1. In chrome-devtools MCP, load `/profile` and resize to **320px** and **1280px+**.
2. Expect: no horizontal scroll, no clipping/overflow; touch targets ≥ 44px; layout
   matches Figma node `3606-608`.
3. Check console for errors and the network panel for failed requests.

## Success signals

- All four values render correctly and match onboarding data (SC-001, SC-003).
- Profile reachable in one tap from bottom nav (SC-002).
- Logout returns to login in one action and blocks protected routes afterward
  (SC-004).
- Clean render at 320px and 1280px with no console/network errors (SC-005, SC-006).
