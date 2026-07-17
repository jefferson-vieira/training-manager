# Phase 0 Research: Workout Plan Screen

Resolves the three items deferred by `/speckit-clarify` plus the unknowns surfaced
while reading the code. Every decision below is grounded in a file that was read,
not assumed.

## 1. Week ordering — where does Monday→Sunday come from?

**Decision**: Sort in the new backend use-case using a canonical `WEEK_ORDER`
constant, so `GET /workout-plans/active` honours its contract of returning days in
week order. No migration, no frontend sort.

**Rationale**: `prisma/schema.prisma:39-47` declares the enum as
`SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY`. PostgreSQL orders
enums by *declaration order*, so the obvious `orderBy: { weekDay: 'asc' }` returns
**Sunday first** — silently violating FR-007. This is the single most likely bug in
the feature and it would look like a design mistake, not a query mistake. An explicit
in-memory sort of 7 rows is free, self-documenting, and keeps the ordering guarantee
attached to the contract that promises it.

**Alternatives considered**:

- *`orderBy: { weekDay: 'asc' }`* — rejected: produces Sunday-first (see above).
- *Reorder the enum so Monday is first* — rejected: PostgreSQL cannot reorder existing
  enum values; `ALTER TYPE … ADD VALUE … BEFORE` only places *new* values. Would need a
  type swap migration touching live data to fix a display concern.
- *Add an integer `order` column to `WorkoutDay`* — rejected: a migration plus a new
  invariant to maintain, to encode a fact the `weekDay` enum already carries.
- *Sort on the frontend* — rejected: the spec's endpoint contract states days arrive
  week-ordered; pushing the sort to each consumer means every future consumer must
  rediscover the Sunday-first trap.

## 2. The new endpoint

**Decision**: `GET /workout-plans/active`, `operationId: getActiveWorkoutPlan`,
reusing the existing `GetWorkoutPlanResponse` DTO. New use-case
`GetActiveWorkoutPlan` querying `where: { userId, isActive: true }`, throwing
`NotFoundError` when absent.

**Rationale**:

- **Route collision is a non-issue**: `routes/index.ts:13` registers the plugin under
  prefix `/workout-plans`, and Fastify's router (find-my-way) matches static segments
  before parametric ones regardless of registration order — so `/active` wins over
  `/:workoutPlanId`. Worth noting the parametric route validates `z.uuid()`, so a
  mis-prioritised match would 400 loudly rather than misbehave silently.
- **Reusing `GetWorkoutPlanResponse`** (`dtos/GetWorkoutPlanResponse.ts`) keeps one
  shape for "a plan with day summaries": days carry `exercisesCount`, not full exercise
  lists. The screen renders exactly a count, so this fetches nothing it does not draw
  (Principle VI: lean payloads).
- **`NotFoundError` → 404** matches `GetWorkoutPlan.ts`, which already throws it; the
  existing error handler maps it, so 404 needs no new plumbing.
- **The name `/active` is the codebase's own word.** The domain concept is spelled
  *active* everywhere it already appears: the `is_active` column (`schema.prisma`),
  `activeWorkoutPlanId` (`schemas/HomeSchema.ts:6`), the message
  `'Active workout plan not found'` (`GetHomeData.ts:37`, `GetStats.ts:36`), and the
  existing filter `?isActive=true` (`workout-plan.routes.ts:37`). `/active` therefore
  adds **zero new vocabulary** — a reader who knows `isActive` already knows what
  `/workout-plans/active` returns, and `getActiveWorkoutPlan` reads as the singular of
  `getWorkoutPlans({ isActive: true })`.

**Alternatives considered**:

- *Name it `/workout-plans/current`* (the spec's original wording) — rejected on
  vocabulary grounds. "Current" is a fine REST idiom in the abstract, but here it would
  be a **second word for a concept this codebase already names consistently**, forcing
  every reader to hold `current == isActive` in their head and inviting a future
  `?isActive=true` vs `/current` divergence. The repo's own singleton precedent,
  `GET /me` (`me.routes.ts`), likewise uses a domain word rather than "current".
  Superseded by the 2026-07-17 clarification.
- *Reuse `GET /workout-plans?isActive=true`* — rejected on two counts: it returns an
  **array** (the client would carry "did I get exactly one?" logic into the page), and
  `GetWorkoutPlans.ts` includes **full `exercises`** for every day — a much heavier
  payload than the screen's exercise *count* needs.
- *Resolve `activeWorkoutPlanId` from home data, then call `GET /:workoutPlanId`* —
  rejected: two round-trips, and it reintroduces the stale-plan hole that
  `/active` closes by construction (spec SC-007).

## 2a. Should `GetActiveWorkoutPlan` be shared with the other `isActive` readers?

**Decision**: No. `GetActiveWorkoutPlan` owns its own `findFirst`, and no existing
use-case is refactored to call it.

**Rationale**: The `findFirst/findUnique where { isActive: true, userId }` selector is
**already the established pattern**, repeated independently in five shipped use-cases —
`GetHomeData.ts:31`, `GetStats.ts:30`, `StartWorkoutSession.ts:18`,
`CompleteWorkoutSession.ts:16`, and `CreateWorkoutPlan.ts:16,36`. This use-case is the
sixth instance of a pattern, not the second instance of a duplication. The repetition is
a two-line `where` clause; each caller pairs it with a *different* `include` and a
different projection (home also needs sessions, streak and today's day; stats needs
neither). Extracting a shared "get the active plan" helper would have to be generic over
those includes to be reused, producing exactly the premature abstraction the
constitution warns against ("three similar lines beats a premature abstraction"), while
touching four shipped flows that have **no automated tests** to catch a regression
(Principle I). The cost/benefit is clearly negative.

**Alternatives considered**:

- *Have `GetHomeData` call `GetActiveWorkoutPlan`* — rejected: `GetHomeData` needs the
  raw `_count` shape plus week sessions; it would consume the mapped/sorted output and
  then re-derive, coupling a shipped flow to this feature's contract for no gain.
- *Extract a `findActiveWorkoutPlan(userId, include)` data helper* — rejected:
  parameterising over `include` reinvents the Prisma call it wraps, with worse types.

## 2b. Why not a user-first path (`/me/workout-plan`, `/user/workout-plan`)?

**Decision**: Keep `GET /workout-plans/active`. The endpoint stays in the WorkoutPlan
collection namespace; no user-first prefix is introduced.

**Rationale**: A `/me/…` path is a good idiom when user-scoping is the *distinguishing*
property of a route. Here it is the **ambient condition of the entire API** — all ten
routes across `ai`, `home`, `me`, `stats` and `workout-plan` call
`getSession(request, reply)` and filter by `session.user.id`. A prefix that qualifies for
every route in the API distinguishes nothing; taken seriously it would demand `/me/home`,
`/me/stats` and `/me/workout-plans/:id` too.

Three further points, each grounded in a file that was read:

- **`/me` is the User resource, not a container.** `me.routes.ts` registers exactly one
  route — `GET /` → `getUser` → `UserSchema`, tag `'Me'`. It is the singleton User,
  structurally parallel to `/workout-plans/:id` being a WorkoutPlan. Mounting a plan
  under it would redefine `/me` from *"the User"* into *"a namespace of my things"* — a
  meaning its only current occupant does not carry.
- **The codebase already declined this twice.** `/home` resolves the active plan
  (`GetHomeData.ts:31`) and `/stats` resolves it too (`GetStats.ts:30`, summary *"Get
  user workout stats"*). Both are maximally user-first data, and both took a flat,
  resource-named prefix rather than `/me/home` or `/me/stats`. A user-first path here
  would be a third convention competing with an established one.
- **`/active` is the singular of a filter that already exists.** `GET /workout-plans`
  returns only the caller's plans, and `?isActive=true` (`workout-plan.routes.ts:37`)
  already filters them by this exact predicate. So `/workout-plans/active` reads as the
  singular of `getWorkoutPlans({ isActive: true })` on an already-user-scoped
  collection — the scoping is inherited, and the path need not restate it. This also
  keeps the route's OpenAPI tag (`['Workout Plan']`) and DTO (`GetWorkoutPlanResponse`)
  aligned with its sibling `GET /:workoutPlanId`, so `/docs` groups them together.

**Alternatives considered**:

- *`GET /me/workout-plan`* — rejected. Beyond the above: it makes one entity reachable at
  two unrelated paths returning the same DTO (singular `/me/workout-plan` vs plural
  `/workout-plans/:id`), and since the plan screen uses the returned `id` to build
  `/workout-plans/:planId/days/:dayId` links (FR-010), the `/me` route would be an alias
  that hands back an id for the *other* namespace — evidence that `/workout-plans` is the
  resource's canonical home.
- *`GET /user/workout-plan`* — rejected for the same reasons, and it additionally
  introduces a `/user` prefix that does not exist (`routes/index.ts` registers `/ai`,
  `/home`, `/me`, `/stats`, `/workout-plans`), competing with `/me` for one concept.
- *Move the whole API under `/me`* (the consistent version of the idea) — rejected as out
  of scope: it would rewrite five shipped route groups and every generated Orval call
  site, with no automated tests to catch regressions (Principle I), to relocate a
  scoping fact that `getSession` already makes unambiguous.

**Acknowledged trade-off**: in isolation `/workout-plans/active` could be misread as "the
globally active plan(s)". That ambiguity is real in the abstract but not here, because
the collection it selects from is already implicitly the caller's.

## 3. Rest card composition

**Decision**: A new, separate `WorkoutRestCard` component. `WorkoutDayCard` is reused
untouched for training days.

**Rationale**: Figma metadata gives exact dimensions — training cards are **350×200**,
which is an exact match for `WorkoutDayCard`'s `h-[200px]` (`workout-day-card.tsx:51`),
so training days reuse it as-is (FR-016 satisfied). Rest cards are **350×110** with a
different structure: no cover image, no image overlay, no duration, no exercise count,
a light surface instead of a dark photo, and a zap icon + "Descanso". The two share no
internals beyond the *idea* of a weekday badge, and even that differs (translucent-on-
photo vs. muted-on-surface).

Adding an `isRest` branch to `WorkoutDayCard` would fork its entire render tree behind
an `if` — two components sharing a filename. Separate components keep each one honest
about its single responsibility (Principle II) and avoid props that exist only to be
ignored by half the callers.

**Alternatives considered**:

- *`variant="rest"` prop on `WorkoutDayCard`* — rejected: an early-return branch
  returning entirely different markup is a separate component wearing a trench coat.
- *A generic `<Card>` both compose* — rejected: premature abstraction over two
  instances (constitution: "three similar lines beats a premature abstraction").

## 4. Origin marker for the day header

**Decision**: Query parameter `?from=home` on the home screen's link only. The day
**page** (a Server Component) reads `searchParams`, derives the title via a small
pure helper, and passes it to `WorkoutDayHeader` as a `title` prop.

**Rationale**: FR-013 makes the weekday label the default and "Treino de Hoje" the
special case, so only the home link needs to carry the marker — the plan screen's links
stay clean, and a bare/deep-linked URL naturally falls back to the weekday label.
Deriving on the server keeps `WorkoutDayHeader` presentational (it already is a client
component only because it calls `router.back()`), and keeps the title rule out of the
component per Principle II.

**Alternatives considered**:

- *`useSearchParams()` inside the header* — rejected: forces a Suspense boundary and
  puts branching logic in a component that should just render.
- *`Referer` header* — rejected: unreliable, and invisible on refresh.
- *A separate route for the plan-originated view* — rejected: duplicates a whole page
  to change one string.

## 5. Weekday labels — one source of truth

**Decision**: Move `WEEKDAY_LABELS` out of `workout-day-card.tsx` into a shared module
and store values in **title case** (`'Segunda'`). `WorkoutDayCard` already applies the
`uppercase` CSS class, so its rendering is unchanged.

**Rationale**: The constant is currently module-private in `workout-day-card.tsx:14-22`
with **uppercase values** (`'SEGUNDA'`), but Figma node `3606-810` shows the day header
in **title case** (`Segunda`). Since the card's badge applies `uppercase` in CSS
(`workout-day-card.tsx:68`), storing title case yields `SEGUNDA` on the card *and*
`Segunda` in the header from one constant. Storing uppercase instead would force the
header to do CSS-based re-casing gymnastics on already-uppercased text.

**Alternatives considered**:

- *A second title-case map for the header* — rejected: two maps to keep in sync.
- *`toLowerCase()` + `capitalize` CSS in the header* — rejected: derives presentation
  from a value that was needlessly lossy in the first place; breaks on `SÁBADO`-style
  accents less predictably than a literal.

## 6. Route protection & layout placement

**Decision**: Place the page at `app/(main)/workout-plan/page.tsx`. No `proxy.ts` change.

**Rationale**: `proxy.ts:4` treats only `/login` as public and its matcher covers all
non-asset paths, so `/workout-plan` is protected automatically. The `(main)` group's
layout (`app/(main)/layout.tsx`) renders `BottomNav`, which the prototype requires.

## 7. Navigation link

**Decision**: `<NavLink href="/workout-plan" icon={Calendar} />`, replacing the inert
`<button>` at `bottom-nav.tsx:13-15`.

**Rationale**: `NavLink` (`components/nav-link.tsx:19`) computes
`isActive = pathname === href` — exact matching, which is precisely right for a static
route and satisfies FR-002 with no new logic. `href` is typed as `Route`, so the
literal typechecks once the page file exists. This is the payoff of the `/workout-plan`
URL decision: a dynamic path would have forced `BottomNav` to fetch the active plan id
before it could even render a link.

## 8. Banner asset

**Decision**: Export the banner image from Figma node `3606:80` to
`packages/web/public/workout-plan-banner.jpg`; render with `next/image` `fill` +
`priority`, mirroring the home banner (`(home)/page.tsx:26-42`).

**Rationale**: It is a distinct photo from `home-banner.jpg`. `proxy.ts`'s matcher
excludes image extensions, so a static asset needs no auth consideration. `priority` is
correct for an above-the-fold LCP element and matches the established home pattern.

## 9. Client regeneration

**Decision**: Backend contract first, then `cd packages/web && npx orval` with the
backend running; the page consumes the generated `getActiveWorkoutPlan`.

**Rationale**: Mandated by the constitution's cross-package contract rule and
`orval.config.ts`, which reads the live `/openapi.json`. Server Components call
generated functions directly (`days/[workoutDayId]/page.tsx:22` calls `getWorkoutDay`),
so the plan page follows that same shape — no new data-access layer.
