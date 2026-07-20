# Feature Specification: Progress Screen (Tela Evolução)

**Feature Branch**: `004-progress-screen`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "tela evolução - crie a tela ... Seja fiel ao figma. Os dados necessários devem ser obtidos da API GET /api/stats (já existente). Os dados exibidos são: sequência de dias consecutivos (streak); tabela de consistência por dia (últimos seis meses); treinos feitos (concluídos); taxa de conclusão; tempo total de treino (somatória). Banner de streak com/sem cor conforme streak < 2. Tabela de consistência quadriculada refletindo dias sem treino (branco), iniciado (azul claro) e concluído (azul). Dias de descanso não contam para a streak e aparecem brancos. Linhas = dias da semana (domingo a sábado), colunas = semanas com label do mês na primeira coluna de cada mês. Tooltip/clique mostrando DD/MM. Taxa de conclusão percentual. Tempo total em horas e minutos (ex.: 115h40m). Header com logo igual às outras telas. Acessível pelo ícone chart-no-axes-column no menu inferior."

## Clarifications

### Session 2026-07-17

- Q: When the user has no active workout plan (stats returns 404), how should the Progress screen behave? → A: Redirect to `/onboarding`, matching the existing home flow.
- Q: How should the "last six months" range be bounded so grid columns align to full weeks? → A: Full weeks — start on the Sunday of the week six months ago and end on the current week's Saturday (~26 Sun–Sat columns); days outside the range render white.
- Q: At what streak value should the colored streak banner appear? → A: Colored when the streak is greater than 0 (1 or more); neutral only when the streak is 0. (Supersedes the original input's "streak < 2" wording.)

## User Scenarios *(mandatory)*

### User Story 1 - View training progress summary (Priority: P1)

As a logged-in student with an active workout plan, I want to open a progress screen that summarizes my training performance so I can understand how consistent I have been and stay motivated.

**Why this priority**: This is the core value of the screen. Without the summary metrics (streak, completed workouts, completion rate, total time) the screen delivers no insight. It is the minimal viable slice.

**Independent Verification**: Can be demonstrated by tapping the progress icon in the bottom menu — or the "Ver histórico" action in the home screen's Consistência section — and observing the streak banner and the three summary metrics rendered from `GET /api/stats` for the signed-in user. Delivers value on its own even without the consistency grid.

**Acceptance Scenarios**:

1. **Given** a signed-in user with an active plan and completed sessions, **When** they open the progress screen, **Then** the screen shows the consecutive-day streak, the number of completed workouts, the completion rate as a percentage, and the total training time formatted as hours and minutes (e.g. `115h40m`).
2. **Given** the user's streak is greater than 0 (1 or more), **When** the screen renders, **Then** the streak banner is shown in its colored (highlighted) variant.
3. **Given** the user's streak is 0, **When** the screen renders, **Then** the streak banner is shown in its neutral (uncolored) variant.
4. **Given** the user has no completed sessions in the period, **When** the screen renders, **Then** completed workouts show `0`, completion rate shows `0%`, total time shows `0h00m` (or equivalent zero state), and the streak banner uses the neutral variant.
5. **Given** a signed-in user on the home screen, **When** they tap "Ver histórico" in the Consistência section header, **Then** they are taken to the Progress screen, arriving at the same screen the bottom-menu progress icon opens.

---

### User Story 2 - Explore daily consistency over the last six months (Priority: P2)

As a student, I want to see a calendar-like grid of my last six months of training so I can spot patterns of consistency and gaps at a glance.

**Why this priority**: The consistency grid is the signature visual of the screen and deepens the insight, but the summary metrics (P1) already deliver standalone value, so this comes second.

**Independent Verification**: Can be demonstrated by opening the screen and confirming the grid renders one column per week and one row per weekday (Sunday→Saturday) covering the last six months, with each cell colored according to that day's training status.

**Acceptance Scenarios**:

1. **Given** the last six months of data, **When** the grid renders, **Then** rows represent weekdays from Sunday (top) to Saturday (bottom) and columns represent consecutive weeks.
2. **Given** a day with no training and any rest day, **When** the grid renders, **Then** that cell appears white/empty.
3. **Given** a day where a session was started but not completed, **When** the grid renders, **Then** that cell appears light blue.
4. **Given** a day where a session was completed, **When** the grid renders, **Then** that cell appears blue.
5. **Given** the columns of the grid, **When** month labels are shown, **Then** only the first column belonging to each month displays that month's label and subsequent columns of the same month display no label.

---

### User Story 3 - Inspect a specific day (Priority: P3)

As a student, I want to identify which calendar day a grid cell represents so I can relate the visual pattern to actual dates.

**Why this priority**: A convenience that improves interpretability but is not required for the screen to deliver its primary insight.

**Independent Verification**: Can be demonstrated by hovering over or tapping a grid cell and observing a tooltip showing the day and month.

**Acceptance Scenarios**:

1. **Given** the consistency grid, **When** the user hovers the mouse over a cell, **Then** a tooltip shows that day's date in `DD/MM` format.
2. **Given** the consistency grid on a touch device, **When** the user taps a cell, **Then** the same `DD/MM` date is shown for that cell.

---

### Edge Cases

- **No active plan**: If the user has no active workout plan, `GET /api/stats` responds 404 and the screen redirects to `/onboarding` (same as the home flow) rather than showing a broken state.
- **Empty period**: A user with an active plan but zero sessions in the last six months sees an all-white grid, zeroed metrics, and the neutral streak banner.
- **Partial month at grid edges**: The grid always renders full Sun–Sat weeks; any leading/trailing days that fall outside the queried six-month range are treated as non-training (white), and the month-label rule still applies to the first in-month column.
- **Rest days vs. missed days**: Rest days and missed (untrained) non-rest days both render white; neither increments the streak.
- **Very large totals**: Total training time formatting must support values exceeding 99 hours (e.g. `115h40m`) without truncation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a Progress screen reachable by tapping the "chart-no-axes-column" icon in the bottom navigation menu.
- **FR-002**: The Progress screen MUST display the same logo header used by the other main screens.
- **FR-003**: The screen MUST source all displayed data from the existing `GET /api/stats` endpoint for the signed-in user, requesting a period that starts on the Sunday of the week six months before today and ends on the current week's Saturday (full Sun–Sat weeks).
- **FR-004**: The screen MUST display the user's consecutive-day workout streak.
- **FR-005**: The system MUST display a streak banner in a colored (highlighted) variant when the streak is greater than 0 (1 or more), and in a neutral (uncolored) variant when the streak is 0.
- **FR-006**: The screen MUST display the count of completed (finished) workouts for the period.
- **FR-007**: The screen MUST display the completion rate as a percentage.
- **FR-008**: The screen MUST display the total accumulated training time in hours-and-minutes format (e.g. `115h40m`), supporting totals greater than 99 hours.
- **FR-009**: The screen MUST display a consistency grid covering the last six months as complete Sun–Sat weeks (~26 columns), with rows as weekdays ordered Sunday (top) through Saturday (bottom) and columns as consecutive weeks. Cells for days outside the queried range MUST render white.
- **FR-010**: Each grid cell MUST be colored by that day's status: white for no training and for rest days, light blue for a session started but not completed, and blue for a completed session.
- **FR-011**: Rest days and untrained days MUST NOT count toward the streak and MUST render as white cells.
- **FR-012**: The grid MUST label columns by month such that only the first column of each month shows the month label and all following columns of the same month show no label.
- **FR-013**: Users MUST be able to see a cell's date in `DD/MM` format by hovering over it (pointer devices) or tapping it (touch devices), presented as a tooltip.
- **FR-014**: The screen visual design MUST faithfully match the referenced Figma frames (screen, streak banner colored/neutral variants, and consistency grid).
- **FR-015**: When `GET /api/stats` returns a non-200 response indicating no active plan (404), the screen MUST redirect the user to `/onboarding`, matching the existing home flow.
- **FR-016**: The screen MUST be usable and visually correct on mobile (320px) and desktop (1280px+) widths without horizontal overflow.
- **FR-017**: The "Ver histórico" action in the home screen's Consistência section header MUST navigate the user to the Progress screen — the same destination as the bottom-menu progress icon. It MUST behave as a navigation control (keyboard-activatable, ≥ 44×44px touch target) rather than an inert element.

### Key Entities *(include if feature involves data)*

- **Workout Stats**: Aggregated performance data for a user over a date range — consecutive-day streak, completed-workout count, completion rate (0–1), total training time (seconds), and per-day consistency map.
- **Daily Consistency Entry**: For a given calendar date, whether a session was started and whether it was completed, driving the grid cell color.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in user with an active plan can reach the Progress screen from any main screen in a single tap on the bottom-menu progress icon, and from the home screen in a single tap on "Ver histórico" — both entry points landing on the same screen.
- **SC-002**: All five data points (streak, completed workouts, completion rate, total time, consistency grid) render from live data within the app's standard perceived-load expectation (no perceptible lag on local dev).
- **SC-003**: The streak banner variant (colored vs. neutral) matches the streak value in 100% of observed cases at the 0 vs. 1+ boundary.
- **SC-004**: Every grid cell's color correctly reflects its day status (white / light blue / blue) when compared against the underlying stats data for a sample of at least one week of each status.
- **SC-005**: Month labels appear exactly once per month (on the first in-month column) with no duplicate or missing month labels across the six-month range.
- **SC-006**: Hovering or tapping any grid cell reveals the correct `DD/MM` date for that cell.
- **SC-007**: Completion rate is shown as a whole-or-decimal percentage and total time is shown in `NNhNNm` format for every non-zero and zero case, including totals over 99 hours.
- **SC-008**: The screen renders without horizontal scroll or clipped content at 320px and 1280px widths.

## Assumptions

- The six-month window is snapped to full weeks: `from` is the Sunday of the week six months before today and `to` is the current week's Saturday; these are passed to `GET /api/stats`.
- The existing `GET /api/stats` response shape is sufficient and requires no backend changes; `consistencyByDay` provides `workoutDayStarted` and `workoutDayCompleted` per date, and days absent from the map are treated as no-training (white).
- Rest days are not distinguished from untrained days in the grid (both white), matching the stated requirement that rest days are not counted and appear white.
- Completion rate percentage rounding follows the app's standard number presentation (reasonable default: whole-number percent) unless the Figma specifies decimals.
- The logo header component and bottom-navigation are the existing shared components; this feature wires the currently inert progress icon to the new route and reuses the header. The no-active-plan redirect reuses the same `/onboarding` redirect pattern as the home flow.
- The home screen's "Ver histórico" control already exists but is currently inert; this feature only wires it to the Progress screen. Its label, placement, and visual styling are unchanged — no new home-screen UI is introduced.
- No new npm dependencies are required; date handling and formatting reuse the stack already present in the web package.
- Authentication and route protection reuse the app's existing patterns for main (protected) screens.
