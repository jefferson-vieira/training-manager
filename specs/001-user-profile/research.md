# Phase 0 Research: User Profile Screen

All Technical Context unknowns are resolved below. No open `NEEDS CLARIFICATION`.

## R1. Profile data source — `GET /me`

- **Decision**: Consume the existing `GET /me` endpoint via the Orval-generated
  `getUser()` function in `@/lib/api/fetch-generated`.
- **Rationale**: The backend route (`packages/backend/src/routes/me.routes.ts`,
  operationId `getUser`) already returns exactly the fields the screen needs, via
  `GetUser` use-case: `id`, `name`, `image`, `age` (computed from `birthdate`),
  `bodyFatPercentage`, `heightInCentimeters`, `weightInGrams` (schema:
  `UserSchema`). No backend work and no Orval regen are needed.
- **Alternatives considered**: Adding a dedicated `/profile` endpoint — rejected as
  redundant; `/me` already exposes the full profile and is the single source of
  truth. Fetching via a client-side hook — rejected in favor of server-side fetch
  (RSC) to avoid a client waterfall and match the home page pattern.

## R2. "No profile" redirect signal

- **Decision**: On the server, call `getUser()` and `redirect('/onboarding')` when
  `response.status !== 200` — before rendering any UI.
- **Rationale**: `GetUser` throws `NotFoundError` (→ HTTP `404`) when the user has no
  `UserProfile` row, which is precisely "onboarding not completed." This mirrors the
  home page (`app/(home)/page.tsx`), which does
  `if (homeData.status !== 200) redirect('/onboarding')`. Using the same non-200
  rule keeps behavior consistent (spec FR-013, clarification session 2026-07-13) and
  guarantees the check runs before render (no empty-screen flash).
- **Alternatives considered**: Client-side redirect after fetch — rejected (causes a
  flash of empty UI, violates the clarified requirement). A bespoke
  profile-existence check — rejected; reuse the existing signal.

## R3. Authentication / route protection

- **Decision**: Rely on the existing `proxy.ts` guard (any route not in
  `publicRoutes` requires a `training-manager` session cookie, else redirect
  `/login`). The page itself does not need the DAL `getUser()` session call because
  `/me` already returns the authenticated user's data and 401s otherwise.
- **Rationale**: Avoids duplicate session round-trips. `proxy.ts` matcher already
  covers `/profile`. Note the naming collision: the Orval client exports `getUser`
  (the `/me` fetch) and `lib/dal.ts` also exports `getUser` (the session) — import
  the generated one with an alias (e.g. `getUser as getProfile`) to avoid confusion.
- **Alternatives considered**: Calling DAL `getUser()` too (as home does for the
  greeting) — unnecessary here since the profile data already carries `name`/`image`.

## R4. Logout — better-auth client

- **Decision**: A small `"use client"` logout button calls
  `authClient.signOut({ fetchOptions: { onSuccess: () => router.push('/login') } })`
  using `useRouter` from `next/navigation`.
- **Rationale**: Verified against better-auth 1.5.1 docs (Context7): the React client
  exposes `signOut` and supports redirect via `fetchOptions.onSuccess`. The project
  already instantiates `authClient` in `lib/auth.ts`. On failure the button surfaces
  feedback and remains retryable (spec edge case), so it must be a client component.
- **Alternatives considered**: Server action calling `auth.api.signOut` — heavier for
  a single button and diverges from the client `authClient` already configured; the
  client path is simpler and matches the existing sign-in-with-google client usage.

## R5. Bottom navigation entry point + active state

- **Decision**: Convert `app/(home)/_components/bottom-nav.tsx` to a `"use client"`
  component, turn the `UserRound` `<button>` into `<Link href="/profile">`, keep
  `House` → `/`, and use `usePathname()` to apply an active style to the current
  item (spec FR-008/FR-009).
- **Rationale**: The component currently renders plain icons with no active
  indication and `UserRound` is a no-op `<button>`. `usePathname` is the standard App
  Router way to detect the active route; `ChatOpenButton` is already a client
  component, so making the nav client-side is low-risk and keeps it reusable across
  `/` and `/profile`.
- **Alternatives considered**: Duplicating the nav per route — rejected (UX debt).
  Keeping it a Server Component and computing active state from a prop — rejected;
  `usePathname` is cleaner and the nav has no server-only data.

## R6. Value formatting & units

- **Decision**: Add pure formatter functions in `packages/web/src/lib/format.ts`:
  weight grams → kg, height cm → user-facing string, body fat `0–1000` → percentage,
  age → years. Components call these; no conversion logic lives in JSX.
- **Rationale**: Domain stores weight in grams, height in cm, body fat on a 0–1000
  scale (40% = 400); the screen must present human-readable units (spec FR-007,
  Assumptions). Keeping conversion in a utility honors Constitution II (no business
  logic in components) and enables reuse. `age` already arrives as an integer year
  from the backend, so only display formatting is needed.
- **Alternatives considered**: Inline conversions in the component — rejected
  (violates code-quality rule, not reusable). Adding a formatting library — rejected
  (Minimal Dependencies; trivial arithmetic).

## R7. Missing individual value (defensive)

- **Decision**: `profile-field` renders a clear placeholder (e.g. "—") when a value
  is `null`/`undefined`.
- **Rationale**: `/me` returns either all values (200) or 404 (redirect), so a single
  missing value is unlikely, but FR-014 requires a graceful empty state rather than a
  broken/blank value. Cheap to implement defensively.

## Summary of impact

| Area | Change | Regen/Migration |
|------|--------|-----------------|
| Backend | None | None |
| Prisma | None | None |
| Orval client | None (endpoint already generated) | **No `npx orval` needed** |
| Web routes | New `/profile` route | — |
| Web components | Modify bottom nav; new profile components + formatter | — |
