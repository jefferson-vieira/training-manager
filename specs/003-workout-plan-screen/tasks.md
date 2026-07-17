---

description: "Task list for Workout Plan Screen implementation"
---

# Tasks: Workout Plan Screen

**Input**: Design documents from `/specs/003-workout-plan-screen/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/get-active-workout-plan.md)

**Tests**: **FORBIDDEN** — Constitution Principle I prohibits all automated tests. Verification is manual, per [quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and manual verification of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `packages/backend/src/` (routes, use-cases, schemas, dtos, lib)
- **Web**: `packages/web/src/` (app, components, lib)
- **Database**: `packages/backend/prisma/schema.prisma` — **not touched by this feature**
- **Generated (do not edit)**: `packages/backend/src/generated/`, `packages/web/src/lib/api/fetch-generated/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bring the local environment up. No scaffolding — the monorepo, both packages, and the DB schema already exist; this feature adds no dependency and no migration.

- [X] T001 Start the local stack: `cd packages/backend && docker compose up -d && npx prisma migrate dev && npm run dev` (:3333, docs at `/docs`), then `cd packages/web && npm run dev` (:3000). Both packages need a `.env` (`cp .env.example .env`). The backend must stay running — Phase 2's Orval regen reads its live `/openapi.json`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The API contract and the shared label constant. Every user story depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. T005 in particular gates every frontend task — nothing downstream typechecks without the generated `getActiveWorkoutPlan`.

- [X] T002 Create `GetActiveWorkoutPlan` use-case in `packages/backend/src/use-cases/workout-plan/GetActiveWorkoutPlan.ts`. Mirror `GetWorkoutPlan.ts`: `findFirst` where `{ userId, isActive: true }`, `include` `workoutDays` with `_count.exercises`, map `_count.exercises` → `exercisesCount`, throw `NotFoundError('Active workout plan not found')` when absent. **Then sort `workoutDays` against a module-local `WEEK_ORDER = [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY]` constant.** Do **not** use `orderBy: { weekDay: 'asc' }` — `enum WeekDay` is declared Sunday-first in `packages/backend/prisma/schema.prisma:39-47` and PostgreSQL orders enums by declaration order, so that would return a rotated week (research.md §1). **Do not refactor `GetHomeData` or `GetStats` to share this query** — the `isActive` selector is the established pattern across five shipped use-cases and stays duplicated here by decision (research.md §2a).
- [X] T003 Register `GET /active` in `packages/backend/src/routes/workout-plan.routes.ts`, calling `GetActiveWorkoutPlan` with `session.user.id` from `getSession(request, reply)`. Schema: `operationId: 'getActiveWorkoutPlan'`, no params/querystring, responses `200: GetWorkoutPlanResponse` (reused unchanged), `401/404/500: ErrorSchema`, `summary: 'Get the active workout plan'`, `tags: ['Workout Plan']`. Place it alongside the other `GET`s — Fastify matches static segments before parametric ones, so ordering vs `/:workoutPlanId` does not matter. See [contracts/get-active-workout-plan.md](./contracts/get-active-workout-plan.md).
- [X] T004 Verify the contract at `http://localhost:3333/docs` **before any UI exists**: as a user with an active plan expect `200` with `workoutDays.length === 7`, `workoutDays[0].weekDay === "MONDAY"`, `workoutDays[6].weekDay === "SUNDAY"`, days carrying `exercisesCount` and **no** `exercises` array; as a user with no active plan expect `404`. The MONDAY-first assertion is the one that catches a missing/incorrect T002 sort — a rotated week renders without error and looks like a design bug.
- [X] T005 Regenerate the typed client with the backend running: `cd packages/web && npx orval`. Confirm `getActiveWorkoutPlan` appears in `packages/web/src/lib/api/fetch-generated/`. Never hand-edit that directory.
- [X] T006 [P] Create `packages/web/src/helpers/workout-day.ts` exporting `WEEKDAY_LABELS: Record<GetWorkoutDay200WeekDay, string>` with **title-case** values (`Segunda`, `Terça`, `Quarta`, `Quinta`, `Sexta`, `Sábado`, `Domingo`). Delete the module-private copy at `packages/web/src/components/workout-day-card.tsx:14-22` and import from the new module; keep importing the `GetWorkoutDay200WeekDay` type from `@/lib/api/fetch-generated` (already used at `workout-day-card.tsx:9`). The card applies `uppercase` in CSS (`workout-day-card.tsx:68`), so its badge must still render `SEGUNDA` — verify the home card is visually unchanged.

**Checkpoint**: The endpoint returns a correctly ordered week, the client exposes it, and one label constant serves every surface. User story work can begin.

---

## Phase 3: User Story 1 - View the active plan's week (Priority: P1) 🎯 MVP

**Goal**: `/workout-plan` renders the active plan — banner, plan-name badge, and seven day cards in week order — reachable from the calendar icon and "Ver treinos".

**Independent Verification**: Sign in as a user with an active plan, tap the calendar icon in the bottom navigation, and confirm the plan screen shows the plan-name badge, the "Plano de Treino" title, and all seven days Segunda→Domingo, with training days showing duration and exercise count and rest days showing "Descanso" — matching Figma `3606-79`.

### Implementation for User Story 1

- [X] T007 [P] [US1] Export the banner image from Figma node `3606:80` to `packages/web/public/workout-plan-banner.jpg`. It is a distinct photo from the existing `home-banner.jpg`.
- [X] T008 [US1] Create `packages/web/src/app/(main)/workout-plan/page.tsx` as a Server Component: call `getActiveWorkoutPlan()`, and `redirect('/onboarding')` when `status !== 200` (this guard is US4's requirement FR-011, but the page cannot access `.data` without handling the non-200 branch, so it lands here). Follow the pattern in `app/(main)/(home)/page.tsx:16-18`. Placing the page under `(main)` gives it the `BottomNav` from `app/(main)/layout.tsx`; `proxy.ts` protects it automatically with no change.
- [X] T009 [P] [US1] Create `packages/web/src/app/(main)/workout-plan/_components/workout-plan-banner.tsx`: banner image (`next/image`, `fill`, `priority` — it is the LCP element), Fit.ai logo (`import logo from '@/assets/imgs/logo.svg'`, as at `(home)/page.tsx:6,44`), the plan-name badge (shadcn `Badge` from `components/ui/badge.tsx`, fed the plan's real `name` — never hardcode "Hipertrofia & Força"), and the "Plano de Treino" title. Mirror the home banner's structure (`(home)/page.tsx:26-42` — absolutely-positioned `Image` with `fill`+`priority` at 28-34 under a gradient overlay). Per Figma `3606-84`.
- [X] T010 [P] [US1] Create `packages/web/src/app/(main)/workout-plan/_components/workout-rest-card.tsx` — the 350×110 rest card per Figma node `3606:129`: weekday badge (`WEEKDAY_LABELS` from `helpers/workout-day.ts`, uppercased in CSS to match the training card), a `Zap` lucide icon, and the day's name ("Descanso"). No cover image, no duration, no exercise count. This is a separate component, not an `isRest` branch inside `WorkoutDayCard` — the two share no internals (research.md §3). Do not set a fixed CSS `height`; let content + padding size it (constitution: UI conventions).
- [X] T011 [US1] In `packages/web/src/app/(main)/workout-plan/page.tsx`, render `workoutDays` in the order received (T002 guarantees Segunda→Domingo — do **not** re-sort on the client): `isRest` → `WorkoutRestCard`, otherwise the existing `WorkoutDayCard` from `@/components/workout-day-card`, reused unchanged (its `h-[200px]` already matches the prototype's 350×200 training card). Ensure the list scrolls clear of `BottomNav` without clipping the last card (FR-019).
- [X] T012 [P] [US1] In `packages/web/src/app/(main)/_components/bottom-nav.tsx`, replace the inert `<button>` at lines 13-15 (the `Calendar` one — **not** the `ChartNoAxesColumn` button at 17-19, which stays inert) with `<NavLink href="/workout-plan" icon={Calendar} />`. `NavLink` already computes `isActive = pathname === href` (`components/nav-link.tsx:19`), which satisfies FR-002 with no new logic.
- [X] T013 [P] [US1] In `packages/web/src/app/(main)/(home)/page.tsx`, **replace** the inert "Ver treinos" `<button className="font-heading text-xs text-primary">` at lines 92-94 with a `<Link href="/workout-plan">` carrying the same classes (FR-012). **Replace, do not wrap**: a `<Link>` renders an `<a>`, and an `<a>` wrapping a `<button>` is nested interactive content — invalid HTML and an a11y violation. (The card `Link` at 97-101 wraps a non-interactive `WorkoutDayCard`, which is why *that* one is a wrap.) `Link` is already imported at line 3. Leave the "Ver histórico" button at 68-70 inert — explicitly out of scope.
- [X] T014 [US1] Validate with the **chrome-devtools MCP** (mandatory): open `/workout-plan`, wait for full render, screenshot at **320px** and **1280px**, and compare against Figma `3606-79`. Check alignment, spacing, typography, colours, long-plan-name overflow in the badge, no horizontal scroll, no clipped cards, no `BottomNav` overlap, touch targets ≥ 44×44px, clean console, no failed requests. Fix and re-validate until it matches.

**Checkpoint**: The plan screen is fully functional and independently demonstrable. This is the MVP.

---

## Phase 4: User Story 2 - Open a training day from the plan (Priority: P1)

**Goal**: Training day cards open the existing day screen, whose header now names the day being viewed.

**Independent Verification**: From the plan screen, tap a training day card for a day other than today; confirm the day screen opens for that day with its header showing that day's weekday label (e.g. "Segunda") and its exercise list matching that day, and that "<" returns to the plan screen.

**⚠️ Ordering**: T018 must land **in the same change** as T016/T017. T016 flips the header from a hardcoded string to an origin-driven rule whose *default* is the weekday label — until the home link carries `?from=home`, the home flow shows "Segunda" instead of "Treino de Hoje" (a US3 regression). If splitting the work, do T018 first: adding the marker is a harmless no-op while the header is still hardcoded.

### Implementation for User Story 2

- [X] T015 [P] [US2] Add a pure helper to `packages/web/src/helpers/workout-day.ts` that derives the day-screen header title: returns `'Treino de Hoje'` when the origin marker is `'home'`, otherwise `WEEKDAY_LABELS[weekDay]`. Keeping the rule here (not inline in the component) satisfies Principle II — logic out of components.
- [X] T016 [US2] In `packages/web/src/app/(main)/workout-plans/[workoutPlanId]/days/[workoutDayId]/page.tsx`, add `searchParams: Promise<{ from?: string }>` to the `WorkoutDayPageProps` type (lines 11-16, which currently declares only `params`), destructure it in the signature at 18-20, and `await` it alongside `params` at line 21. Derive the title via the T015 helper from `workoutDay.data.weekDay` **after** the guard at 25-27 (`workoutDay.data` is only safely readable once `status !== 200` has returned), then pass it to `<WorkoutDayHeader />` at line 35. Depends on T015 and T017.
- [X] T017 [US2] In `packages/web/src/app/(main)/workout-plans/[workoutPlanId]/days/[workoutDayId]/_components/workout-day-header.tsx`, accept a `title` prop on `WorkoutDayHeader` (line 8, currently takes no props) and render it in place of the hardcoded `'Treino de Hoje'` at line 24. Keep the component client-side (it calls `router.back()` at line 18) and otherwise unchanged.
- [X] T018 [US2] In `packages/web/src/app/(main)/(home)/page.tsx`, append `?from=home` to the "Treino de Hoje" card's `Link` href at line 98. See the ordering warning above — without this, US3 regresses the moment T016 lands.
- [X] T019 [US2] In `packages/web/src/app/(main)/workout-plan/page.tsx`, wrap each **training** day card in a `Link` to `/workout-plans/${plan.id}/days/${day.id}` — **bare, with no `from` marker**, so the header falls back to the weekday label (FR-013). Use the plan `id` from the `getActiveWorkoutPlan` response. Leave `WorkoutRestCard` unwrapped so rest days stay inert (FR-009).
- [X] T020 [US2] Validate with the **chrome-devtools MCP**: from the plan screen open a training day; screenshot the header at 320px and 1280px and compare against Figma `3606-810`. Confirm the title-case label ("Segunda", not "SEGUNDA"), that "<" returns to the plan screen, and that tapping a rest card does nothing.

**Checkpoint**: The plan screen is a working navigation hub into day details.

---

## Phase 5: User Story 3 - Preserve the existing "Treino de Hoje" entry point (Priority: P1)

**Goal**: The shipped home → day flow is untouched by the header change. This is a regression-guard story: its one code change (T018) ships with US2 by necessity, so this phase is verification.

**Independent Verification**: From home, tap the "Treino de Hoje" card and confirm the header reads "Treino de Hoje" and session start/complete behave exactly as in the previous release.

### Implementation for User Story 3

- [X] T021 [US3] Verify the home entry point at `/` → "Treino de Hoje" card: the day screen header reads **"Treino de Hoje"** (FR-013). This is the assertion that T018 exists and works.
- [X] T022 [US3] Verify feature 002's behaviour is unchanged on a home-originated day screen (FR-015): "Iniciar treino" pinned at top, "Marcar como concluído" pinned at bottom, correct success/error toasts, the "Finalizado!" badge after completion, and rest-day/invalid-day redirects to home. This is the main regression risk of the whole feature.
- [X] T023 [US3] Verify a day URL pasted directly **without** `?from=home` shows the weekday label, confirming the fallback branch (FR-013).

**Checkpoint**: Both day-screen entry points behave per spec; no regression.

---

## Phase 6: User Story 4 - Guard users without an active plan (Priority: P2)

**Goal**: No active plan → onboarding, never a broken or empty screen. The redirect itself lands in T008; this phase proves it across entry paths.

**Independent Verification**: As a logged-in user with no active plan, attempt to reach `/workout-plan` and confirm a redirect to `/onboarding` without the plan screen rendering.

### Implementation for User Story 4

- [X] T024 [US4] Verify the no-active-plan guard: deactivate the user's plan (`npx prisma studio` → `workout_plan.is_active = false`), then visit `/workout-plan` and confirm the backend returns 404 and the app redirects to `/onboarding` with the plan screen never painting. Repeat via the calendar icon and "Ver treinos" (FR-011).
- [X] T025 [US4] Verify the unauthenticated path: signed out, visit `/workout-plan` and confirm the redirect to `/login` via `packages/web/src/proxy.ts` (FR-014). No code change expected — this confirms the route inherits existing protection.

**Checkpoint**: All user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T026 [P] Update `docs/CODEBASE.md` (Portuguese; source of truth for structure) with the new `GET /workout-plans/active` endpoint, the `GetActiveWorkoutPlan` use-case, the `/workout-plan` route, and the `helpers/workout-day.ts` shared module.
- [X] T027 [P] Run `npm run lint` and `npm run build` in both `packages/backend` and `packages/web`; fix any dead imports left behind by the `WEEKDAY_LABELS` move (T006).
- [X] T028 Run the full [quickstart.md](./quickstart.md) validation end to end, including the regression checklist (home card still renders `SEGUNDA`; `GET /workout-plans/:workoutPlanId` unchanged for existing consumers).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: No dependencies.
- **Foundational (T002-T006)**: Depends on T001 (the backend must run for T004/T005). **BLOCKS all user stories.**
- **US1 (T007-T014)**: Depends on Foundational. 🎯 MVP.
- **US2 (T015-T020)**: Depends on **US1** — you cannot tap a day card until the plan screen renders it (T011).
- **US3 (T021-T023)**: Depends on US2 (specifically T018, which ships inside US2's phase).
- **US4 (T024-T025)**: Depends on US1 (T008 contains the redirect).
- **Polish (T026-T028)**: Depends on all desired stories.

### Story Dependencies — deviation from the template's independence ideal

These stories are **not** mutually independent, and pretending otherwise would produce a misleading plan:

- **US2 requires US1's screen** to have something to tap.
- **US3 is coupled to US2 by construction**: FR-013 makes the weekday label the *default* and "Treino de Hoje" the marked special case, so flipping the header (T016) without the home marker (T018) regresses the shipped flow. They must land together; T018 is therefore placed inside US2's phase, leaving US3 as verification.
- **US4's guard is implemented in US1's page task** (T008) because the page cannot read `.data` without handling the non-200 branch. US4 verifies it.

### Within Each Story

- Use-case → route → manual contract check → Orval regen → frontend (strict; T002→T003→T004→T005).
- T015 (helper) + T017 (prop) → T016 (page wires them together).
- T011 (cards render) → T019 (cards become links).

### Parallel Opportunities

- **T006** ‖ **T002-T005** — the label move is web-only and touches no generated code.
- **T007, T009, T010** — asset, banner component, rest card: three different files, no shared edits.
- **T012, T013** — nav and home links: different files.
- **T015** ‖ **T017** — different files; T016 joins them.
- **T026, T027** — docs and lint.

⚠️ **T008 and T011 both edit `workout-plan/page.tsx`**, and **T013 and T018 both edit `(home)/page.tsx`** — never run those pairs in parallel.

---

## Parallel Example: User Story 1

```bash
# After T008 creates the page shell, three independent files:
Task: "T007 Export banner asset from Figma 3606:80 to packages/web/public/workout-plan-banner.jpg"
Task: "T009 Create packages/web/src/app/(main)/workout-plan/_components/workout-plan-banner.tsx"
Task: "T010 Create packages/web/src/app/(main)/workout-plan/_components/workout-rest-card.tsx"

# Then, independently of the above:
Task: "T012 Wire the Calendar NavLink in packages/web/src/app/(main)/_components/bottom-nav.tsx"
Task: "T013 Link 'Ver treinos' in packages/web/src/app/(main)/(home)/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001 (Setup) → T002-T006 (Foundational). **Do not skip T004** — verifying MONDAY-first at the API is far cheaper than diagnosing a rotated week through the UI.
2. T007-T014 (US1).
3. **STOP and VALIDATE**: the plan screen against Figma `3606-79` at 320px and 1280px.
4. Demo-ready: a browsable weekly plan reachable from two entry points.

### Incremental Delivery

1. Foundational → contract proven at `/docs`.
2. + US1 → **MVP**: the week is visible.
3. + US2 (**including T018**) → days are openable; header is origin-aware.
4. + US3 → regression verified; both entry points correct.
5. + US4 → guard verified.
6. + Polish → docs, lint, full quickstart.

### Parallel Team Strategy

Limited upside here — the chain Foundational → US1 → US2 → US3 is inherently sequential. The real parallelism is *within* US1 (T007/T009/T010/T012/T013). One developer can carry the whole feature; a second adds most value taking T026-T027 while US2-US4 are verified.

---

## Notes

- [P] = different files, no dependencies.
- Constitution forbids automated tests — no test tasks appear above, and none may be added.
- Never edit `packages/web/src/lib/api/fetch-generated/` or `packages/backend/src/generated/` by hand; regenerate via T005.
- No Prisma migration in this feature — it is read-only over existing models.
- Commit after each task or logical group.
- A UI task is not complete until the rendered screen matches the prototype (T014, T020).
