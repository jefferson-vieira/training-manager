# Feature Specification: Today's Workout Screen

**Feature Branch**: `002-today-workout-screen`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "tela de treino de hoje - crie a tela em https://www.figma.com/design/Vdvl7fFXQ4TH0ktjwhr7dK/FIT.AI--Alunos---Copy-?node-id=3606-679. Seja fiel ao protótipo. O usuário deve ser redirecionado para essa tela ao clicar no card de treino do dia do treino ativo na home (link na linha 97 no packages/web/src/app/(main)/(home)/page.tsx). Para obter os dados do dia de treino já tem o endpoint na api: GET /:workoutPlanId/days/:workoutDayId. Verifique se o usuário tem uma sessão de treino ativa para o dia corrente; caso o usuário não tenha uma sessão de treino iniciada para o dia, exiba um botão 'Iniciar treino' e oculte o botão 'Marcar como concluído'; caso o usuário já tenha iniciado a sessão então faça o inverso. Para iniciar uma sessão de treino chame a API em POST /:workoutPlanId/days/:workoutDayId/sessions. Para marcar a sessão de treino como concluída use o endpoint PATCH /:workoutPlanId/days/:workoutDayId/sessions/:sessionId/complete. Caso o usuário tente acessar essa página diretamente pela url e caso não tenha um dia de treino ele deve ser redirecionado para a tela inicial. O botão 'Marcar como concluído' caso exista deve estar sempre visível fixo na parte inferior ao rolar, porém sem sobrepor o menu inferior. O cartão com o botão 'Iniciar treino' deve estar sempre visível e fixado na parte superior caso o botão exista, sem sobrepor o header da página. O botão '<' no header deve voltar a página. Os botões de ajuda (os com ícone '?') não devem fazer nada por enquanto. Os botões 'Iniciar treino' e 'Marcar como concluído' devem exibir feedbacks de sucesso (ou erro) quando clicados, conforme o que ocorrer; as mensagens devem ser no formato de toast (sonner). Quando o usuário concluir o treino exiba no local do botão 'Iniciar treino' um feedback em tela badge amigável com tema de sucesso 'Finalizado!'"

## Clarifications

### Session 2026-07-14

- Q: How does the screen obtain the current session state and the session id needed to complete? → A: Extend the `GET /:workoutPlanId/days/:workoutDayId` response to include the day's current session (session id + started/completed timestamps), and regenerate the typed web client via the API-contract flow.
- Q: What should the screen do when today's day is a rest day (`isRest = true`)? → A: Redirect to the home screen (a rest day is not an actionable workout), consistent with the invalid-access guard.
- Q: How should the screen respond when "Iniciar treino" fails because a session already exists (409 already-started)? → A: Reconcile silently to the actual state (in-progress or completed), show an informational toast, and present the correct controls.

## User Scenarios *(mandatory)*

### User Story 1 - View today's workout details (Priority: P1)

An authenticated user with an active plan taps the "Treino de Hoje" card on the
home screen and lands on a dedicated screen that faithfully reproduces the Figma
prototype. The screen shows the day's name, cover image, estimated duration, and
the full list of exercises with their sets, reps, and rest information, exactly
as designed.

**Why this priority**: Seeing today's workout in full is the core value of the
feature. Everything else (starting a session, completing it) builds on the user
being able to review what they will train today. It is a viable, demonstrable
slice on its own.

**Independent Verification**: With a logged-in user who has an active plan and a
workout day for today, tap the home "Treino de Hoje" card and confirm the screen
opens showing the day name, cover image, estimated duration, and the ordered list
of exercises matching the prototype and the day's data.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an active plan, **When** they tap the "Treino de Hoje" card on the home screen, **Then** they are taken to the today's workout screen for that day.
2. **Given** the workout screen is open, **When** it finishes loading, **Then** the day name, cover image, estimated duration, and the ordered list of exercises (with sets, reps, and rest) are displayed and match the prototype.
3. **Given** the workout screen is open, **When** the user taps the "<" back control in the header, **Then** they return to the previous screen.
4. **Given** the workout screen is open, **When** the user taps any help ("?") control, **Then** nothing happens (these are inert in this release).

---

### User Story 2 - Start today's workout session (Priority: P1)

A user who has not yet started a session for today's workout day sees a pinned
card at the top containing an "Iniciar treino" button, and the "Marcar como
concluído" bar is hidden. Tapping "Iniciar treino" starts the session and gives
immediate feedback.

**Why this priority**: Starting a session is the primary action the screen
exists to enable and gates the completion flow. Without it the user cannot record
that they trained.

**Independent Verification**: With a logged-in user on today's workout screen who
has no started session for the day, confirm the "Iniciar treino" card is visible
and pinned at the top while "Marcar como concluído" is hidden; tap "Iniciar
treino" and confirm a success toast appears and the screen switches to the
in-progress state.

**Acceptance Scenarios**:

1. **Given** a user with no started session for today's day, **When** the screen loads, **Then** the "Iniciar treino" card is shown pinned at the top (without overlapping the header) and the "Marcar como concluído" bar is hidden.
2. **Given** the "Iniciar treino" card is shown, **When** the user scrolls the exercise list, **Then** the card stays pinned at the top and does not overlap the header.
3. **Given** a user taps "Iniciar treino", **When** the session starts successfully, **Then** a success toast is shown and the screen switches to the in-progress state (start action replaced, "Marcar como concluído" bar now visible).
4. **Given** a user taps "Iniciar treino", **When** the start fails, **Then** an error toast is shown and the screen remains in the not-started state.

---

### User Story 3 - Complete today's workout session (Priority: P1)

A user who has an in-progress session for today sees a "Marcar como concluído"
bar pinned to the bottom of the screen (without overlapping the bottom
navigation). Tapping it completes the session, shows feedback, and replaces the
top action with a friendly "Finalizado!" success badge.

**Why this priority**: Completing the session is what closes the training loop
and feeds consistency/streak tracking. It is the payoff of the whole flow.

**Independent Verification**: With a logged-in user on today's workout screen who
has an in-progress session, confirm the "Marcar como concluído" bar is pinned at
the bottom above the navigation; tap it and confirm a success toast appears, the
bottom bar disappears, and a "Finalizado!" success badge is shown where the start
action was.

**Acceptance Scenarios**:

1. **Given** a user with an in-progress session for today, **When** the screen loads, **Then** the "Marcar como concluído" bar is shown pinned at the bottom (without overlapping the bottom navigation) and the "Iniciar treino" button is hidden.
2. **Given** the "Marcar como concluído" bar is shown, **When** the user scrolls the exercise list, **Then** the bar stays pinned at the bottom and never overlaps the bottom navigation.
3. **Given** a user taps "Marcar como concluído", **When** completion succeeds, **Then** a success toast is shown, the bottom bar is hidden, and a "Finalizado!" success badge appears where the "Iniciar treino" action used to be.
4. **Given** a user taps "Marcar como concluído", **When** completion fails, **Then** an error toast is shown and the session remains in the in-progress state.
5. **Given** a user re-opens today's workout screen after having already completed the session, **When** the screen loads, **Then** the "Finalizado!" badge is shown and neither the "Iniciar treino" button nor the "Marcar como concluído" bar is displayed.

---

### User Story 4 - Guard against invalid direct access (Priority: P2)

A user who navigates directly to the screen's URL for a plan/day that does not
resolve to a valid workout day is redirected to the home screen instead of seeing
a broken or empty screen.

**Why this priority**: It protects the experience from broken deep links and
stale URLs, but it is a safeguard around the primary flows rather than the core
value, so it ranks below the main stories.

**Independent Verification**: As a logged-in user, navigate directly to the screen
URL with a plan/day that does not exist or is not accessible, and confirm the app
redirects to the home screen without rendering the workout screen.

**Acceptance Scenarios**:

1. **Given** a user opens the screen URL directly, **When** no valid workout day resolves for the given plan/day, **Then** they are redirected to the home screen before the workout screen renders.
2. **Given** a user reaches the screen for a day that is a rest day (`isRest = true`), **When** the page loads, **Then** they are redirected to the home screen before the workout screen renders.
3. **Given** an unauthenticated user opens the screen URL directly, **When** the page loads, **Then** they are redirected to the login flow (consistent with existing route protection).

---

### Edge Cases

- **Already-completed session on load**: Screen shows the "Finalizado!" badge and hides both action buttons (see US3 scenario 5).
- **Start attempted when a session already exists**: The start request is rejected as "already started"; the screen reconciles to the actual in-progress (or completed) state, shows an informational toast, and presents the correct controls rather than a blocking error (FR-018).
- **Rest day**: A day marked as rest (`isRest = true`) is treated as not an actionable workout; reaching such a day via this screen (including a home card that links a rest day) redirects to the home screen (FR-014).
- **Slow or failing data load**: While the day data is loading the user sees a loading state; if the day cannot be loaded the invalid-access guard applies (redirect to home).
- **Double taps**: Repeated taps on "Iniciar treino" or "Marcar como concluído" while a request is in flight must not fire duplicate requests or duplicate toasts.
- **Small screens (320px)**: Pinned top card and pinned bottom bar must remain fully visible and not clip the exercise list, the header, or the bottom navigation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home "Treino de Hoje" card MUST navigate to the today's workout screen for the active plan's current workout day.
- **FR-002**: The screen MUST load and display the workout day's details — name, cover image, estimated duration, and the ordered list of exercises with their sets, reps, and rest time — faithfully to the Figma prototype.
- **FR-003**: The screen MUST determine the current session state for the day — no session started, session in progress, or session completed — from the `GET /:workoutPlanId/days/:workoutDayId` response, which MUST be extended to include the day's current session (session id plus started/completed timestamps). The typed web client MUST be regenerated via the API-contract flow rather than inventing a parallel frontend DTO.
- **FR-004**: When no session is started for the day, the screen MUST show the "Iniciar treino" action (in a card pinned to the top) and MUST hide the "Marcar como concluído" action.
- **FR-005**: When a session is in progress for the day, the screen MUST show the "Marcar como concluído" action (a bar pinned to the bottom) and MUST hide the "Iniciar treino" action.
- **FR-006**: When the session for the day is completed, the screen MUST hide both action controls and show a friendly success badge reading "Finalizado!" in the location where the "Iniciar treino" action appears.
- **FR-007**: Tapping "Iniciar treino" MUST start a workout session for the day and, on success, transition the screen to the in-progress state.
- **FR-008**: Tapping "Marcar como concluído" MUST complete the in-progress session for the day and, on success, transition the screen to the completed state (badge shown, bottom bar hidden).
- **FR-009**: Both "Iniciar treino" and "Marcar como concluído" MUST show a toast notification reflecting the outcome — a success toast on success and an error toast on failure.
- **FR-010**: The "Iniciar treino" card, when present, MUST remain visible and pinned at the top while the content scrolls, without overlapping the page header.
- **FR-011**: The "Marcar como concluído" bar, when present, MUST remain visible and pinned at the bottom while the content scrolls, without overlapping the bottom navigation menu.
- **FR-012**: The header "<" control MUST navigate back to the previous screen.
- **FR-013**: Help ("?") controls MUST be present per the prototype but perform no action in this release.
- **FR-014**: If a user reaches the screen (including via direct URL) and no valid workout day resolves for the given plan/day, OR the resolved day is a rest day (`isRest = true`), the user MUST be redirected to the home screen before the workout screen renders.
- **FR-018**: If starting a session fails because a session already exists for the day (already-started conflict), the screen MUST reconcile to the actual current state (in progress or completed), show an informational message, and present the correct controls — rather than showing a blocking error.
- **FR-015**: Access to the screen MUST require an authenticated session, consistent with existing route protection (unauthenticated users are redirected to login).
- **FR-016**: The screen MUST prevent duplicate start/complete requests from a control while a request for that control is already in flight.
- **FR-017**: The screen MUST be usable and visually correct at mobile (320px) and desktop (1280px+) widths, with touch targets of at least 44×44px, consistent with the app's design system.

### Key Entities *(include if feature involves data)*

- **Workout Day**: The training day being viewed — its name, cover image, estimated duration, rest flag, week day, and ordered list of exercises. Belongs to a workout plan.
- **Workout Exercise**: An exercise within the day — name, order, number of sets, number of reps, and rest time between sets.
- **Workout Session**: A record that the user trained a given day — has a start moment and, once finished, a completion moment. Its presence and completion state drive which action control the screen shows (start / complete / finished).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the home screen, a user reaches today's workout screen in a single tap and sees the full workout details without perceptible lag.
- **SC-002**: The rendered screen matches the referenced Figma prototype for all three states (not started, in progress, completed) at mobile and desktop widths, with no overflow, clipping, or overlap of the header or bottom navigation.
- **SC-003**: A user can start a workout and then mark it complete entirely from this screen, receiving a clear success toast at each step, in under 1 minute of interaction.
- **SC-004**: After completing a workout, the user sees the "Finalizado!" success badge and no longer sees either action control, both immediately and on re-opening the screen for the same completed day.
- **SC-005**: Every start/complete attempt produces exactly one outcome toast (success or error) with no duplicate notifications, even under rapid repeated taps.
- **SC-006**: Direct navigation to an invalid plan/day URL redirects to home 100% of the time, and the workout screen is never shown in a broken/empty state.

## Assumptions

- **Current workout day source**: The "current day" is the active plan's `todayWorkoutDay` already surfaced on the home screen; its `workoutPlanId` and day `id` identify the screen's target (matching the existing home link).
- **Session state availability**: Resolved (see Clarifications). The `GET /:workoutPlanId/days/:workoutDayId` response will be extended to include the day's current session (session id + started/completed timestamps), and the typed web client regenerated via the API-contract flow. No parallel/invented frontend DTOs will be created.
- **Redirect target for invalid/absent day**: Redirect to the home screen (`/`), consistent with the home flow's own onboarding/redirect pattern; a rest day (`isRest = true`) is treated as not an actionable workout day for this screen and follows the same redirect.
- **Toasts**: Success/error feedback uses the app's existing toast mechanism (sonner) and copy tone consistent with the Fit.ai brand.
- **Help controls**: The "?" controls are rendered for visual fidelity to the prototype but intentionally do nothing in this release.
- **No editing/logging of exercise progress**: This release only views the day and starts/completes the session; per-exercise tracking (checking off sets, editing weights) is out of scope.
- **Existing endpoints reused**: Starting uses `POST /:workoutPlanId/days/:workoutDayId/sessions`, completing uses `PATCH /:workoutPlanId/days/:workoutDayId/sessions/:sessionId/complete`, and day data comes from `GET /:workoutPlanId/days/:workoutDayId`.

## Dependencies

- Active workout plan and a resolvable current workout day for the user (produced by the existing home data flow).
- An extension of the `GET workout day` response to expose the day's current session (session id + started/completed timestamps), delivered through the API-contract flow (backend schema change → regenerated Orval client).
- Existing session start and completion endpoints.
- Existing authentication/route-protection and toast (sonner) infrastructure.
