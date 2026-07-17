# Feature Specification: Workout Plan Screen

**Feature Branch**: `003-workout-plan-screen`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: "tela plano de treino - crie a tela em https://www.figma.com/design/Vdvl7fFXQ4TH0ktjwhr7dK/FIT.AI--Alunos---Copy-?node-id=3606-79. Seja fiel ao figma. O usuário deve ser redirecionado para essa tela ao clicar no botão de ícone 'Calendar' no menu inferior. Para obter os dados do plano de treino use o endpoint GET /workout-plans/:workoutPlanId. O plano de treino exibido deve ser o plano de treino ativo, o mesmo exibido na home. Caso o usuário não tenha o plano de treino, redirecione ele para o onboarding. Ao clicar em um card de dia de treino, o usuário deve ser redirecionado para a tela de detalhes do treino (a tela em /workout-plans/:workoutPlanId/days/:workoutDayId); ou seja, a mesma tela de 'treino de hoje', porém, agora o header deve refletir o dia de treino visualizado (veja node-id=3606-810). Porém, ainda deve manter o header 'treino de hoje' quando acessar a tela pela home (feature que já existe). A badge em node-id=3606-84 deve ser o nome do plano de treino."

## Clarifications

### Session 2026-07-15

- Q: How should the workout day screen decide its header title, given it is now reachable from both the home card and the new plan screen? → A: By navigation origin. Arriving from the home card always shows "Treino de Hoje"; arriving from the plan screen shows the viewed day's weekday label (e.g. "Segunda") — even when that day happens to be today's day. Direct URL access with no origin marker falls back to the weekday label.
- Q: `GET /workout-plans/:workoutPlanId` returns any plan the user owns, including deactivated older plans — what should the plan screen do for an owned-but-inactive plan? → A: Supersede that endpoint for this screen. Add a new backend endpoint `GET /workout-plans/active` that returns the user's active plan, or 404 when the user has no active plan. The plan screen renders from this endpoint; a 404 sends the user to onboarding. An inactive plan therefore becomes unreachable from this screen by construction.
- Q: Given the screen resolves its data from the active-plan endpoint, what should its web URL be? → A: `/workout-plan` (singular), with no plan id in the path. The plan id needed to build day links comes from the endpoint's response.
- Q: Should the inert "Ver treinos" button on the home screen be wired up as part of this feature? → A: Yes — it navigates to `/workout-plan`, giving the plan screen a second entry point alongside the calendar navigation control.

### Session 2026-07-17

- Q: The new endpoint was specified as `GET /workout-plans/current`, but the codebase names this concept "active" everywhere it appears (`is_active` column, `activeWorkoutPlanId` in the home response, the message "Active workout plan not found", and the existing `?isActive=true` filter) and never says "current" — which name should it use? → A: `GET /workout-plans/active`, with `operationId: getActiveWorkoutPlan` and use-case `GetActiveWorkoutPlan`. This supersedes the `/current` naming from the 2026-07-15 session; the endpoint's behaviour, response shape and 404 semantics are unchanged. Rationale in research.md §2.

## User Scenarios *(mandatory)*

### User Story 1 - View the active plan's week (Priority: P1)

An authenticated user with an active workout plan taps the calendar control in the
bottom navigation and lands on a dedicated "Plano de Treino" screen that faithfully
reproduces the Figma prototype. The screen shows a banner with the brand logo, a
badge carrying the plan's name, the "Plano de Treino" title, and the plan's seven
days (Monday–Sunday) listed in order — training days as image cards showing the
weekday, day name, estimated duration and exercise count; rest days as compact
cards reading "Descanso".

**Why this priority**: Seeing the whole week at a glance is the entire value of the
screen and is the only thing the new navigation entry point exists to reveal.
Every other story in this feature depends on this list existing. It is a complete,
demonstrable slice on its own.

**Independent Verification**: As a logged-in user with an active plan, tap the
calendar control in the bottom navigation and confirm the plan screen opens showing
the plan-name badge, the "Plano de Treino" title, and all seven days in Monday–Sunday
order, with training days showing duration and exercise count and rest days showing
"Descanso", matching the prototype.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an active plan, **When** they tap the calendar control in the bottom navigation, **Then** they are taken to the workout plan screen showing their active plan.
2. **Given** an authenticated user with an active plan on the home screen, **When** they tap the "Ver treinos" button, **Then** they are taken to the same workout plan screen.
3. **Given** the plan screen is open, **When** it finishes loading, **Then** the badge displays the active plan's name and the screen title reads "Plano de Treino".
4. **Given** the plan screen is open, **When** it finishes loading, **Then** all seven days of the plan are listed in week order (Monday through Sunday), each labelled with its weekday.
5. **Given** the plan screen is open, **When** a day is a training day, **Then** its card shows the day's cover image, name, estimated duration and exercise count, matching the prototype.
6. **Given** the plan screen is open, **When** a day is a rest day (`isRest = true`), **Then** its card shows the "Descanso" treatment from the prototype instead of duration and exercise count.
7. **Given** the plan screen is open, **When** the user views the bottom navigation, **Then** the calendar control is shown in its active/selected state, consistent with the other navigation entries.

---

### User Story 2 - Open a training day from the plan (Priority: P1)

From the plan screen, a user taps any training day card and is taken to that day's
workout details screen — the same screen already used for today's workout — where
the header now names the day being viewed (e.g. "Segunda") rather than "Treino de
Hoje".

**Why this priority**: Browsing the week is only useful if the user can drill into a
day. This turns the plan screen from a static overview into a navigation hub, and it
is the reason the header must become day-aware.

**Independent Verification**: From the plan screen, tap a training day card for a day
other than today and confirm the workout day screen opens for that day with its
header showing that day's weekday label and its exercise list matching that day.

**Acceptance Scenarios**:

1. **Given** the plan screen is open, **When** the user taps a training day card, **Then** they are taken to that day's workout details screen for the active plan.
2. **Given** the user arrived at the workout day screen from the plan screen, **When** the screen loads, **Then** the header title shows the viewed day's weekday label (e.g. "Segunda") instead of "Treino de Hoje".
3. **Given** the user arrived at the workout day screen from the plan screen for a day that happens to be today's day, **When** the screen loads, **Then** the header still shows that day's weekday label (origin, not the date, decides the title).
4. **Given** the user is on a workout day screen reached from the plan screen, **When** they tap the "<" back control, **Then** they return to the plan screen.
5. **Given** the plan screen is open, **When** the user taps a rest day card, **Then** nothing happens — rest cards are not interactive.

---

### User Story 3 - Preserve the existing "Treino de Hoje" entry point (Priority: P1)

A user who reaches the workout day screen by tapping the "Treino de Hoje" card on the
home screen continues to see exactly the experience that exists today, including the
"Treino de Hoje" header — unchanged by the new plan-screen entry point.

**Why this priority**: This is an existing, shipped flow. Making the header day-aware
must not regress it. It ranks alongside the new stories because a regression here
breaks the app's primary daily action.

**Independent Verification**: From the home screen, tap the "Treino de Hoje" card and
confirm the workout day screen opens with the header reading "Treino de Hoje" and all
existing start/complete session behaviour intact.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an active plan on the home screen, **When** they tap the "Treino de Hoje" card, **Then** the workout day screen opens with its header reading "Treino de Hoje".
2. **Given** the user arrived at the workout day screen from home, **When** the screen loads, **Then** the start/complete session controls and all other existing behaviour are unchanged from the current release.
3. **Given** a user opens a workout day URL directly with no origin marker, **When** the screen loads, **Then** the header shows the viewed day's weekday label.

---

### User Story 4 - Guard users without an active plan (Priority: P2)

A user who reaches the plan screen without an active workout plan — via the navigation
control, the "Ver treinos" button, or a direct URL — is sent to onboarding instead of
seeing a broken or empty screen.

**Why this priority**: It protects the experience from stale links and accounts that
have not completed setup, but it is a safeguard around the primary flows rather than
the core value.

**Independent Verification**: As a logged-in user with no active plan, attempt to reach
the plan screen and confirm the app redirects to onboarding without rendering the plan
screen.

**Acceptance Scenarios**:

1. **Given** an authenticated user with no active workout plan, **When** they reach the plan screen by any entry point, **Then** they are redirected to onboarding before the plan screen renders.
2. **Given** an authenticated user opens the plan screen URL directly and has no active plan, **When** the page loads, **Then** the active-plan request returns "not found" and they are redirected to onboarding.
3. **Given** an unauthenticated user opens the plan screen URL directly, **When** the page loads, **Then** they are redirected to the login flow, consistent with existing route protection.

---

### Edge Cases

- **No active plan**: The user is redirected to onboarding (FR-011), matching the home screen's existing behaviour when home data is unavailable.
- **Deactivated (inactive) plans**: Unreachable from this screen by construction — the screen has no plan id in its URL and always resolves the active plan from the server, so a stale or superseded plan can never be rendered here.
- **Rest day cards**: Rest days are rendered per the prototype but are not tappable, since the workout day screen already redirects rest days to home (existing behaviour from feature 002).
- **Day without a cover image**: The card must degrade gracefully to the prototype's fallback treatment without breaking layout.
- **Plan with fewer or more than seven days**: Plans always span seven days by domain rule; the screen renders whatever days the plan returns, in week order, without assuming a fixed count in a way that would crash.
- **Long plan names**: The badge must accommodate a long plan name without overflowing the banner or clipping the title beneath it.
- **Small screens (320px)**: All seven cards, the banner badge, and the bottom navigation must remain fully visible without horizontal scroll or clipping.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The calendar control in the bottom navigation MUST navigate the user to the workout plan screen.
- **FR-002**: The calendar control MUST reflect an active/selected state while the user is on the plan screen, consistent with the existing navigation entries.
- **FR-003**: A new backend endpoint `GET /workout-plans/active` MUST return the requesting user's active workout plan, and MUST respond "not found" when the user has no active plan. It MUST expose everything the prototype renders: the plan name and, for each day, its weekday, name, cover image, estimated duration, rest flag and exercise count.
- **FR-004**: The plan screen MUST render the active plan obtained from `GET /workout-plans/active` — the same plan surfaced on the home screen. It MUST NOT accept a plan id from its URL.
- **FR-005**: The plan screen MUST display a badge containing the plan's name, in the position occupied by the "HIPERTROFIA & FORÇA" badge in the prototype.
- **FR-006**: The plan screen MUST display the screen title "Plano de Treino" and the brand banner, faithfully to the prototype.
- **FR-007**: The plan screen MUST list the plan's days in week order (Monday through Sunday), each labelled with its weekday.
- **FR-008**: For a training day, the card MUST show the day's cover image, name, estimated duration and exercise count, faithfully to the prototype.
- **FR-009**: For a rest day (`isRest = true`), the card MUST show the prototype's "Descanso" treatment and MUST NOT be interactive.
- **FR-010**: Tapping a training day card MUST navigate to that day's workout details screen, using the plan id returned by the active-plan endpoint.
- **FR-011**: If the active-plan request returns "not found", the user MUST be redirected to onboarding before the plan screen renders.
- **FR-012**: The "Ver treinos" button on the home screen MUST navigate to the workout plan screen.
- **FR-013**: The workout day screen's header title MUST be determined by navigation origin: arriving from the home "Treino de Hoje" card MUST show "Treino de Hoje"; arriving from the plan screen MUST show the viewed day's weekday label; direct access with no origin marker MUST show the viewed day's weekday label.
- **FR-014**: Access to the plan screen MUST require an authenticated session, consistent with existing route protection.
- **FR-015**: The workout day screen's existing behaviour when reached from home — session start/complete controls, rest-day and invalid-access redirects, toasts — MUST remain unchanged.
- **FR-016**: The plan screen MUST reuse the existing day card presentation shared with the home screen rather than introducing a parallel card implementation, extending it only as the prototype requires.
- **FR-017**: The new endpoint MUST be delivered backend-first through the API-contract flow: backend route and response contract first, then regeneration of the typed web client, which the screen consumes. The frontend MUST NOT introduce a parallel DTO for the plan or its days.
- **FR-018**: The plan screen MUST be usable and visually correct at mobile (320px) and desktop (1280px+) widths, with touch targets of at least 44×44px, consistent with the app's design system.
- **FR-019**: The plan screen MUST NOT overlap or obscure the bottom navigation, and its content MUST scroll beneath the navigation without clipping the last day card.

### Key Entities *(include if feature involves data)*

- **Workout Plan**: The user's active training plan — its name (shown in the badge) and its ordered set of seven workout days. Only one plan is active per user; this screen only ever shows the active one.
- **Workout Day**: A day within the plan — weekday, name, cover image, estimated duration, rest flag, and exercise count. Rest days carry no duration or exercises and are not navigable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From anywhere in the main app, a user reaches their full weekly plan in a single tap on the calendar control, and the seven days are visible without perceptible lag.
- **SC-002**: The rendered plan screen matches the referenced Figma prototype at mobile and desktop widths, with no overflow, clipping, or overlap of the bottom navigation.
- **SC-003**: The badge always shows the active plan's real name, and the days shown always match the plan the home screen refers to — verified by comparing the home "Treino de Hoje" card against the corresponding day on the plan screen.
- **SC-004**: A user can open any training day of the week from the plan screen in a single tap and sees a header naming that day, then returns to the plan screen with the back control.
- **SC-005**: The home → "Treino de Hoje" flow is unchanged: the header still reads "Treino de Hoje" and session start/complete still work exactly as in the previous release.
- **SC-006**: A user with no active plan reaching the plan screen is redirected to onboarding 100% of the time, and the plan screen is never shown in a broken or empty state.
- **SC-007**: The plan screen never displays a deactivated plan, regardless of entry point or URL manipulation.

## Assumptions

- **Active plan resolution**: Resolved (see Clarifications). A new `GET /workout-plans/active` endpoint returns the active plan or "not found". This supersedes the original instruction to read the screen's data from `GET /workout-plans/:workoutPlanId`, which remains untouched for its existing consumers.
- **Endpoint response shape**: `GET /workout-plans/active` mirrors the existing `GET /workout-plans/:workoutPlanId` response (plan plus days carrying `exercisesCount` rather than full exercise lists), so the screen fetches no more data than it renders.
- **Day ordering**: The endpoint returns the plan's days already in week order (Monday→Sunday), so no consumer needs to re-sort them.
- **Plan screen route**: The screen lives at `/workout-plan` (singular), with no plan id in the path. The existing day route `/workout-plans/:workoutPlanId/days/:workoutDayId` is unchanged, and its plan id comes from the active-plan response.
- **Navigation link**: Because the route is static, the bottom navigation links to it directly and its active state works through the existing exact-path matching — no home-data lookup is needed to construct the link.
- **Banner asset**: The plan screen's banner uses its own image from the prototype, distinct from the home screen's banner.
- **Origin marker**: Distinguishing "arrived from home" from "arrived from the plan screen" is conveyed explicitly by the link (e.g. a query parameter); the exact mechanism is an implementation decision for the planning phase. The weekday label is the fallback when no marker is present, so refreshes and deep links stay coherent.
- **Weekday labels**: The plan screen and the day header reuse the weekday labels already established in the shared day card (`SEGUNDA`…`DOMINGO`), keeping copy consistent across screens.
- **Rest days are terminal**: Rest cards are display-only. This matches the existing workout day screen, which already redirects rest days to home.
- **Redirect target**: Users without an active plan go to `/onboarding`, mirroring the home screen's existing redirect rather than introducing a new empty state.
- **Scope**: This release adds the plan overview, the new active-plan endpoint, and the navigation wiring only. Editing the plan, switching between plans, viewing past/inactive plans, and per-day session actions from the plan screen are out of scope. The home "Ver histórico" button remains inert.

## Dependencies

- A new `GET /workout-plans/active` endpoint and the regenerated typed web client that exposes it (API-contract flow).
- An active workout plan for the user, produced by the existing onboarding/plan-creation flow.
- The existing workout day screen (feature 002) and its shared day card component.
- Existing authentication and route-protection infrastructure.
