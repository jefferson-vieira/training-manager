# Feature Specification: Recorde de Sequência de Treinos (Workout Streak Record)

**Feature Branch**: `010-workout-streak-record`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "recorde de sequência de treinos - implementar a feature de 'Recorde' conforme protótipo Figma na tela de stats dentro do banner de consistência (/stats), seguindo a arquitetura funcional Workout Streak (histórico como fonte da verdade + estado materializado para leitura O(1), atualização no evento de treino, validação sob demanda na leitura, sem jobs diários)."

## Overview

Today the app already shows the user's **current** workout streak ("Sequência Atual") in the streak banner on `/stats`. This feature adds the user's **all-time record** ("Recorde") — the longest streak they have ever achieved — displayed as a trophy badge inside that same banner.

Alongside the visible change, the feature replaces the current read-time streak recalculation with a persisted, materialized streak state so that reading the streak is constant-cost, the record survives beyond the queried date window, and the streak rules can evolve later by reprocessing history.

## Clarifications

### Session 2026-08-03

- Q: What defines the day boundary for a workout day? → A: **The UTC calendar day**, for every user. No per-user timezone is stored or consulted. Accepted tradeoff: for a user at UTC-3, a workout begun after 21:00 local time is credited to the *following* streak day.
- Q: Which timestamp dates a workout — when it started or when it finished? → A: **`startedAt`**, matching the behavior already shipped in `CalcStreak`. Completion still gates *whether* a session counts at all; the start timestamp decides *which day* it counts for. A session spanning midnight belongs to the day it began.
- Q: What should the badge show for a user who has never completed a workout? → A: **Always render the badge**, including `RECORDE: 0 DIAS` when the record is 0. *(Superseded 2026-08-04 — the original answer was "hide the badge entirely when the record is 0"; the badge is now unconditional.)*
- Q: How is the materialized state created for users who already have history? → A: **Eager, one-off backfill script run at deploy**, building state for every existing user from their workout history. The read path does not lazily rebuild; a user with no state row is treated as an all-zero streak (see FR-017a), which is correct for users who have never completed a workout.
- Q: A session can be completed long after it was started, retroactively inserting a day that has already passed — which the forward-only incremental update cannot express. What should happen? → A: **Detect and rebuild.** When a completion attributes a workout to a day at or before `last_workout_day` (an out-of-order insertion), the system rebuilds that user's state from history instead of incrementing. Correctness is preserved at the cost of a rare slow path on the write side; reads stay constant-cost.
- Q: If the streak update fails while completing a workout, what happens? → A: **Single transaction** — the session completion and the streak update commit together or neither commits. A failed streak update fails the whole request and the user retries. Accepted tradeoff: a defect in streak maintenance can block a user from recording a completed workout.
- Q: The Home screen shows a current streak computed over a week-only window (capped at ~7), while Stats uses a 6-month window (capped at ~180) — the same user sees two different numbers today. What should happen? → A: **Migrate Home to the same materialized state.** Both surfaces read one value, so Home's number rises to the true streak for any user past 7 days. This is a deliberate bug fix. The record badge remains Stats-only; Home continues to show only the current streak.
- Q: Which streak continuity rule should govern both current streak and record? → A: **Preserve the existing plan-aware rule.** A streak survives days on which the plan active at that time scheduled no workout (rest days), and survives the current day until it ends; it breaks only when a *scheduled* workout day fully elapses without a completed workout. The strict consecutive-calendar-day rule from the supplied architecture doc is explicitly **not** adopted, because it would visibly collapse the streak of every user whose plan contains rest days.

## User Scenarios *(mandatory)*

### User Story 1 - See my all-time record in the streak banner (Priority: P1)

As a user who trains regularly, I open the Stats screen and, inside the consistency banner that already shows my current streak, I see a badge with a trophy icon reading "RECORDE: N DIAS" — my longest streak ever. This lets me compare where I am now against my personal best.

**Why this priority**: This is the entire user-visible value of the feature. Without it, nothing changes for the user. It is also the smallest slice that can ship on its own.

**Independent Verification**: Open `/stats` as a user with workout history and confirm the badge renders inside the banner, below "Sequência Atual", with the correct record value in both the active (streak > 0) and neutral (streak = 0) banner variants.

**Acceptance Scenarios**:

1. **Given** a user whose longest streak ever is 24 days and whose current streak is 15 days, **When** they open `/stats`, **Then** the banner shows "15 dias / Sequência Atual" and a badge reading "RECORDE: 24 DIAS".
2. **Given** a user whose current streak is 0 but who previously reached 24 days, **When** they open `/stats`, **Then** the neutral banner still shows the badge "RECORDE: 24 DIAS".
3. **Given** a user who has never completed a workout, **When** they open `/stats`, **Then** the banner shows "0 dias / Sequência Atual" and the badge reads "RECORDE: 0 DIAS".
4. **Given** a user whose record is exactly 1 day, **When** they open `/stats`, **Then** the badge reads "RECORDE: 1 DIA" (singular).

---

### User Story 2 - My record updates the moment I beat it (Priority: P2)

As a user on the verge of a personal best, when I complete the workout that pushes my current streak past my previous record, my record immediately reflects the new value the next time I look at Stats — without waiting for any nightly process.

**Why this priority**: A record that lags behind reality undermines the motivational purpose of the badge. It depends on Story 1 being in place to be observable.

**Independent Verification**: With a user whose current streak equals their record, complete a workout that extends the streak by one day, then reload `/stats` and confirm both the current streak and the record incremented together.

**Acceptance Scenarios**:

1. **Given** a user with current streak 9 and record 9, **When** they complete a workout that extends the streak to 10, **Then** `/stats` shows current streak 10 and record 10.
2. **Given** a user with current streak 3 and record 24, **When** they complete a workout that extends the streak to 4, **Then** `/stats` shows current streak 4 and record 24 (unchanged).
3. **Given** a user who already completed a workout today, **When** they complete a second workout on the same day, **Then** neither the current streak nor the record changes.

---

### User Story 3 - My record is preserved when my streak breaks (Priority: P2)

As a user who misses a scheduled workout day, my current streak resets, but my record is retained as the memory of what I have achieved, so the app rewards my history rather than erasing it.

**Why this priority**: Retaining the record across breaks is what makes it a "record" rather than a second copy of the current streak. Also depends on Story 1.

**Independent Verification**: With a user holding a non-zero streak, let a scheduled workout day pass without completing a workout, then open `/stats` and confirm the current streak dropped to 0 while the record kept its previous value.

**Acceptance Scenarios**:

1. **Given** a user with current streak 24 and record 24, **When** a scheduled workout day passes with no completed workout, **Then** `/stats` shows current streak 0 and record 24.
2. **Given** a user whose streak broke and who then completes a workout, **When** they open `/stats`, **Then** the current streak shows 1 and the record is unchanged.
3. **Given** a user with a broken streak who has not opened the app for three months, **When** they open `/stats`, **Then** the current streak shows 0 and the record shows their historical best — with no stale value ever displayed.

---

### User Story 4 - My record already reflects my past training (Priority: P3)

As an existing user with months of workout history, the first time I see the record badge it already shows my true historical best, rather than starting from zero as if I had just signed up.

**Why this priority**: Improves the launch experience for existing users but is not required for the feature to function correctly going forward.

**Independent Verification**: Using an existing account with several months of completed workouts spanning at least one long past streak, open `/stats` after the feature ships and confirm the record matches the longest streak found in that account's history.

**Acceptance Scenarios**:

1. **Given** an existing user whose history contains a past 24-day streak and a current 15-day streak, **When** they open `/stats` for the first time after release, **Then** the record shows 24.
2. **Given** an existing user whose longest streak is their current one, **When** they open `/stats`, **Then** the record equals the current streak.

---

### Edge Cases

- **Record equals current streak**: the badge still renders and displays the same number as the current streak; it is not hidden or specially styled.
- **Never trained**: record is 0 and the badge still renders, reading `RECORDE: 0 DIAS` (see Clarifications).
- **Singular vs plural**: a record of 1 reads "1 DIA"; any other value reads "N DIAS".
- **Multiple workouts in one day**: contribute exactly one day to the streak; repeated completions on the same day are idempotent and never inflate the streak or the record.
- **Session spanning midnight**: a workout started at 23:40 UTC and finished at 00:20 UTC counts for the day it *started*, not the day it finished.
- **Evening workout near the UTC boundary**: day attribution follows UTC, so for a user at UTC-3 a workout started at 20:59 local counts for that day while one started at 21:01 local counts for the next day. This is a known and accepted consequence of the UTC decision, not a defect. A user who trains consistently late is unaffected, because every workout shifts forward equally and the UTC days stay consecutive. However, a user who **mixes** morning and late-evening sessions can lose a streak they lived: training Monday 10:00 local (Monday UTC) and then Tuesday 22:00 local (Wednesday UTC) leaves Tuesday UTC empty, breaking the streak if Tuesday was a scheduled day, despite the user having trained on both days. This is the accepted worst case of choosing UTC over a per-user timezone.
- **Streak longer than the old windows**: a user on a 40-day streak currently sees 40 on Stats and at most 7 on Home; after this change both read the same materialized value. Home's number visibly rises for every user past 7 days — expected, not a defect.
- **Long inactivity**: a user returning after months sees a current streak of 0 and their preserved record, with no periodic background process required to have produced that result.
- **Rest days and plan changes**: a day with no scheduled workout under the plan that was active on that day does not break the streak; the record inherits the same rule.
- **Streak in progress today**: a scheduled workout day that has not yet ended does not break the streak — the user still has the rest of the day to train.
- **Very large numbers**: a three-digit record (e.g. 365) must fit inside the badge without wrapping or clipping the banner at 320px width.
- **Concurrent completions**: two workout completions arriving at nearly the same instant must not double-increment the streak or corrupt the record.
- **User with history but no state row**: because the read path does not rebuild (FR-017a), such a user displays a 0 current streak on **both Home and Stats** plus a `RECORDE: 0 DIAS` badge, and their next completion restarts the streak at 1 — permanently losing their true record unless the backfill is re-run. This is the accepted cost of keeping reads strictly constant-cost; FR-017b (re-runnable backfill) is the remedy, and the backfill must therefore cover every user before release, including any created while it runs.
- **Session completed days after it was started**: a session started Monday and finished Friday counts for Monday (FR-006). If the streak had already reset in the interim, the completion retroactively fills a past day, so the state is rebuilt from history (FR-012b) rather than incremented — recovering any record that the newly-filled day completes.
- **Streak update fails mid-completion**: the workout completion is rolled back with it and the user sees the completion fail, rather than a completed workout whose streak was silently not counted. The user can retry the completion.

## Requirements *(mandatory)*

### Functional Requirements

**Display**

- **FR-001**: The Stats screen MUST display the user's all-time longest streak ("Recorde") as a badge inside the existing consistency/streak banner, positioned below the "Sequência Atual" label, matching the Figma prototype.
- **FR-002**: The badge MUST render in both banner variants — the active variant (current streak greater than 0) and the neutral variant (current streak equal to 0) — with the badge legible against both backgrounds.
- **FR-003**: The badge MUST read `RECORDE: {N} DIAS` in uppercase, using `DIA` (singular) when the record is exactly 1, and MUST be accompanied by a trophy icon.
- **FR-004**: The badge MUST always be rendered, including when the record is 0 (`RECORDE: 0 DIAS`).
- **FR-005**: The badge MUST remain fully visible and unclipped at 320px viewport width and at 1280px and above, including for three-digit record values.

**Streak semantics**

- **FR-006**: A day MUST count toward a streak when the user completed at least one workout attributed to that day. Two distinct timestamps govern this: **completion** determines *whether* a session counts at all (an unfinished session never counts), while the session's **start** determines *which day* it counts for. The day is the **UTC calendar day** of that start timestamp. The same rule MUST be applied identically by the completion-time update, the on-demand validation, and any history rebuild, so all three agree on which day a workout belongs to.
- **FR-007**: Multiple completed workouts on the same day MUST count as exactly one day; the system MUST be idempotent with respect to repeated completions on an already-counted day.
- **FR-008**: The current streak MUST continue across days on which the workout plan active at that time scheduled no workout (rest days), and MUST NOT be broken by the current day until that day has ended.
- **FR-008a**: Determining whether a gap breaks the streak MUST consult the workout plan that was active on each day in the gap, not only the user's current plan, so that a plan change does not retroactively alter past continuity.
- **FR-009**: The current streak MUST reset to 0 once a scheduled workout day has fully elapsed without a completed workout.
- **FR-010**: The record MUST equal the highest value the current streak has ever reached for that user, and MUST never decrease as a result of a streak breaking or of time passing.

**Persistence and freshness**

- **FR-011**: The system MUST persist a materialized per-user streak state comprising the current streak, the record, and the day of the most recent counted workout, so that reading the streak does not require scanning the user's workout history.
- **FR-012**: The materialized state MUST be updated at the moment a workout is completed — when a day newly becomes a counted workout day. The current streak MUST extend when the gap since the last counted day contains no missed scheduled workout day (per FR-008/FR-008a), and MUST restart at 1 otherwise. The record MUST be raised to the current streak whenever the current streak exceeds it.
- **FR-012a**: The workout completion and the resulting streak-state update MUST be atomic — both persist or neither does. If the streak update cannot be applied, the workout completion MUST NOT be persisted and the request MUST fail, so the materialized state is never silently left inconsistent with history.
- **FR-012b**: A workout may be completed long after it was started, attributing it to a day that has already passed. When a completion attributes a workout to a day **at or before** the recorded last counted day, the system MUST NOT apply the incremental update — it MUST rebuild that user's materialized state from history (FR-017), so the record reflects any past streak the newly-inserted day completes. The rebuild MUST occur within the same atomic unit as the completion (FR-012a).
- **FR-013**: The system MUST NOT rely on any scheduled or periodic background process to expire streaks.
- **FR-014**: On every read, the system MUST validate the materialized state against the passage of time — checking whether any scheduled workout day has fully elapsed since the last counted day — and, if the streak has expired purely because time elapsed, MUST correct and persist the state before returning it, so that a stale current streak is never shown.
- **FR-015**: On-demand correction MUST never lower the record; it may only reset the current streak.
- **FR-016**: The workout history MUST remain the source of truth and MUST NOT be modified to reflect streak rules; the materialized state MUST be fully derivable from that history.
- **FR-017**: The system MUST support rebuilding the materialized state for a user from their workout history, so that future rule changes can be reprocessed and so that a corrupted or missing state can be repaired.
- **FR-017a**: The materialized state for all users with pre-existing workout history MUST be built by a one-off backfill executed at release, before the record badge becomes visible. The read path MUST NOT rebuild from history; when no state row exists for a user, the read MUST return an all-zero streak (current 0, record 0, no last counted day) without scanning history.
- **FR-017b**: The backfill MUST be safe to re-run, producing the same result on a second execution as on the first, so that a partial or interrupted run can be repeated without corrupting state.
- **FR-018**: Concurrent workout completions for the same user MUST NOT produce a double-counted day, an inflated streak, or a corrupted record.

**Consistency across the app**

- **FR-019**: The streak **continuity rule** MUST be preserved exactly as it behaves today (plan-aware, per FR-008/FR-008a), so users do not perceive the rules of their streak as having been changed. Displayed *values* may differ from today's only through these three deliberate corrections, which MUST be the sole sources of difference:
  1. **UTC day boundary** (FR-006) — today's calculation implicitly uses the server process's local timezone, so on a non-UTC server some values shift by one day.
  2. **Removal of the Stats 6-month window** — today a streak longer than roughly 180 days is silently truncated by the query window; the materialized state reports it in full.
  3. **Removal of the Home week window** — today Home caps the streak at the days elapsed in the current week (at most 7); it will now show the true streak.
- **FR-020**: Every surface that reports the current streak — currently the Stats banner and the Home flame pill — MUST read from the same materialized state, so the value is identical everywhere it appears at any given moment. No surface may retain an independent, window-bounded calculation.

### Key Entities

- **Workout day history**: the record of which calendar days a user completed a workout. At most one entry per user per day. Append-only from the streak's perspective; never rewritten to satisfy streak rules. Serves as the source of truth and the basis for any rebuild.
- **Workout streak state**: one materialized record per user holding the current streak length, the all-time record length, the day of the most recent counted workout, and when the state was last updated. A derived cache optimized for constant-cost reads, not an independent source of truth.
- **Workout plan schedule** (existing): determines which weekdays were scheduled workout days at a given point in time, which the continuity rule consults to decide whether a gap breaks the streak.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with workout history opening the Stats screen sees their record badge with a correct value, verified against their history, on the first load — 100% of the time.
- **SC-002**: The Stats screen renders the streak banner, including the record badge, with no perceptible additional delay compared to before the change, at both 320px and 1280px widths.
- **SC-003**: **Reading** the streak costs a single constant-cost lookup regardless of how many years of workout history the user has — a user with 5 years of history reads as fast as a user with one week. This holds for every read on Home and Stats without exception. The **write** path is constant-cost too in the normal case; it may fall back to a full history rebuild only on an out-of-order completion (FR-012b), which is rare and never affects read latency.
- **SC-004**: Completing a workout that sets a new personal best is reflected in the record on the very next view of the Stats screen, with no waiting period.
- **SC-005**: A user who stops training for an arbitrary length of time and returns sees a current streak of 0 and their preserved record, without the system having run any scheduled job in the interim.
- **SC-006**: Across all existing accounts, the record shown after release matches the longest streak computable from that account's history.
- **SC-007**: For an unchanged history, any difference in a user's displayed current streak traces to exactly one of the three corrections enumerated in FR-019; no other change in displayed values occurs.
- **SC-008**: At any given moment, the current streak shown on Home and the current streak shown on Stats are the same number for the same user — verifiable by loading both screens back to back with a streak longer than 7 days, which today produces two different numbers.

## Assumptions

- **Scope of display**: The **record badge** is added only to the Stats screen's streak banner. The Home screen already displays the **current streak** as a flame pill beside its weekly consistency tracker, so it is a second surface bound by FR-020.
- **What counts as a workout**: A day counts only when a workout session was *completed*, matching the app's existing streak behavior. Started-but-abandoned sessions do not count.
- **Continuity rule unchanged**: Confirmed in Clarifications — the plan-aware rule already in production is retained rather than replaced with the strict consecutive-calendar-day rule from the supplied architecture doc, so no existing user perceives their streak as having been reset by this release. The materialized state therefore encodes a plan-aware rule, which means the update and on-demand-validation paths must consult plan history rather than doing pure date arithmetic. The architecture still permits switching to a stricter rule later via a history rebuild (FR-017).
- **Backfill on release**: Existing users' materialized state is derived from their existing workout history by a one-off backfill at release (FR-017a), so the record is meaningful from day one rather than starting every user at 0. Because the read path deliberately does not self-heal, the backfill is a required release step, not an optimization. Its blast radius grew once Home was migrated (FR-020): skipping or partially completing it now zeroes **both the record and the current streak, on both Stats and Home**, for every affected user — a far more visible failure than a missing badge. Treat it as a release gate.
- **Copy and language**: All user-facing copy is Portuguese, uppercase in the badge, matching the prototype ("RECORDE: 24 DIAS").
- **Visual system**: The badge reuses the app's existing design tokens, typography, and component primitives; no new visual language is introduced.
- **Authentication**: The record is per-user and only visible to that user through the existing authenticated Stats screen; no sharing, leaderboard, or comparison against other users is in scope.
- **Notifications**: Celebrating a new personal best via notification, animation, or confetti is out of scope for this iteration.
- **History granularity**: The existing workout session history is sufficient to derive the per-day workout history; introducing a separate day-level history record is an implementation choice left to planning, not a user-visible requirement.

## Out of Scope

- Notifying or celebrating the user when a new record is set.
- Displaying streak or record on any screen other than Stats.
- Sharing the record externally or comparing it with other users.
- Changing the streak continuity rule (e.g. allowing one miss per week, ignoring holidays). The architecture must permit it; this release does not do it.
- Historical charts of streak length over time.
