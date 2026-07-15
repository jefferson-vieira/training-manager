---
description: "Task list for Today's Workout Screen"
---

# Tasks: Today's Workout Screen

**Input**: Design documents from `/specs/002-today-workout-screen/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/get-workout-day.md, quickstart.md

**Tests**: **FORBIDDEN** — Constitution Principle I prohibits all automated tests. No test tasks are included. Verification is manual (chrome-devtools MCP, `/docs`, local dev).

**Implementation status (2026-07-14)**: All code implemented. Backend contract verified via `/openapi.json` + Orval regen; all feature files lint-clean and type-check clean (`tsc --noEmit`). US4 redirect guards verified over HTTP (invalid session → `/`, rest day → `/`, both 307). **Blocked**: live chrome-devtools visual validation of the three authenticated states (US1/US2/US3) — establishing a session required the auth secret (permission denied for security) and the dev browser's session is stale. Run scenarios S1–S5, S7 from `quickstart.md` after logging in. Note: `npm run build` currently fails on a **pre-existing, unrelated** error in `src/components/ai-elements/prompt-input.tsx` (not touched by this feature; `@base-ui/react` unchanged by the `sonner` install).

**Organization**: Tasks are grouped by user story so each can be implemented and manually verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 / US4 (maps to spec.md user stories)

## Path Conventions

- **Backend**: `packages/backend/src/`
- **Web**: `packages/web/src/`
- **Route dir** (this feature): `packages/web/src/app/(main)/workout-plans/[workoutPlanId]/days/[workoutDayId]/`
- **Generated (never hand-edit)**: `packages/web/src/lib/api/fetch-generated/`

---

## Phase 1: Setup (Shared UI Infrastructure)

**Purpose**: Add the shared toast + badge primitives the interactive stories rely on.

- [X] T001 Install `sonner` in the web workspace: `cd packages/web && npm install sonner` (adds to `packages/web/package.json`)
- [X] T002 [P] Add the shadcn `badge` component at `packages/web/src/components/ui/badge.tsx` and extend its `cva` variants with a `success` variant using the `--success` token (not hardcoded colors)
- [X] T003 [P] Add the shadcn `sonner` Toaster wrapper at `packages/web/src/components/ui/sonner.tsx`, then mount a single `<Toaster />` in `packages/web/src/app/layout.tsx` (inside `<body>`)
- [X] T004 [P] Add `--success` and `--success-foreground` tokens (light + dark blocks) to `packages/web/src/app/globals.css` and map them under `@theme` (`--color-success`, `--color-success-foreground`); source the value from the Figma completed-state node

**Checkpoint**: Toaster renders app-wide; `Badge` with `success` variant compiles.

---

## Phase 2: Foundational (Backend Contract — Blocking for US2/US3)

**Purpose**: Expose the day's current session so the frontend can derive session state and obtain the `sessionId`. See `contracts/get-workout-day.md`. (US1 does not depend on this; US2 and US3 do.)

**⚠️ CRITICAL**: Must complete before the session-driven stories (US2, US3) begin.

- [X] T005 Add a nullable `session` object (`id: uuid`, `startedAt: iso.datetime`, `completedAt: iso.datetime().nullable()`) to `packages/backend/src/schemas/WorkoutDaySchema.ts`
- [X] T006 In `packages/backend/src/use-cases/workout-plan/GetWorkoutDay.ts`, map `workoutDay.sessions[0]` to a `session` field with `.toISOString()` conversions (`completedAt` preserves `null`); return `null` when no session exists (depends on T005)
- [X] T007 With the backend running (`cd packages/backend && npm run dev`), regenerate the typed client: `cd packages/web && npx orval`; confirm `getWorkoutDay` response now includes `session` in `packages/web/src/lib/api/fetch-generated/index.ts` (depends on T005, T006)

**Checkpoint**: `GET /:workoutPlanId/days/:workoutDayId` returns `session` (verify at `/docs`); web client types updated.

---

## Phase 3: User Story 1 - View today's workout details (Priority: P1) 🎯 MVP

**Goal**: Tapping the home "Treino de Hoje" card opens a screen showing the day's name, cover image, estimated duration, and ordered exercises, faithful to Figma `3606-679`; back "<" returns; "?" buttons are inert.

**Independent Verification**: As a logged-in user with a workout day today, tap the home card → the screen renders all day details matching the prototype; "<" goes back; "?" does nothing.

- [X] T008 [US1] Create the server component `page.tsx` in the route dir that reads route params, calls `getWorkoutDay(workoutPlanId, workoutDayId)`, and composes the header + day details + exercise list (redirect guards added in US4)
- [X] T009 [P] [US1] Create `_components/workout-day-header.tsx` (client): a `sticky top-0` header with a back "<" control calling `router.back()` and inert "?" help buttons (no handler), touch targets ≥ 44px
- [X] T010 [P] [US1] Create `_components/exercise-list.tsx` (server, presentational): render the ordered exercises with name, sets, reps, and rest, per Figma
- [X] T011 [US1] In `page.tsx`, render the day header block — cover image, name, and estimated duration (formatted) — using Tailwind tokens, above the exercise list (depends on T008, T010)
- [ ] T012 [US1] Pull Figma node `3606-679` via the Figma MCP and validate with chrome-devtools MCP at 320px and 1280px; fix spacing/typography/overflow until it matches; confirm no console errors

**Checkpoint**: The screen is reachable from home and displays the full workout day (view-only) at both widths.

---

## Phase 4: User Story 2 - Start today's workout session (Priority: P1)

**Goal**: When no session exists, a pinned top card shows "Iniciar treino" (bottom bar hidden). Tapping starts the session, shows a toast, and transitions to in-progress. Matches Figma `3606-815` / `3606-833`.

**Independent Verification**: On the screen with no session, the pinned "Iniciar treino" card is visible (not overlapping the header) and the bottom bar is hidden; tapping shows a success toast and switches to the in-progress state.

- [X] T013 [US2] Create `actions.ts` (`'use server'`) in the route dir with `startWorkoutSessionAction({ workoutPlanId, workoutDayId })` wrapping the generated `startWorkoutSession`; return `{ ok: true, sessionId }` on 201, `{ ok: false, conflict: true }` on 409 `SESSION_ALREADY_STARTED_ERROR`, `{ ok: false }` otherwise
- [X] T014 [US2] Create `_components/workout-session-actions.tsx` (client) that derives state from the day's `session`; for NOT_STARTED render the top pinned "Iniciar treino" card (`sticky` below the header, no overlap) and keep the bottom bar hidden; wire it into `page.tsx`
- [X] T015 [US2] In the island, call `startWorkoutSessionAction` inside `useTransition`, disable the button while pending (FR-016), show `toast.success`/`toast.error`, and `router.refresh()` on success; on `conflict` show `toast.info` and `router.refresh()` to reconcile (FR-018)
- [ ] T016 [US2] Pull Figma nodes `3606-815` / `3606-833` and validate with chrome-devtools MCP at 320px and 1280px: pinned card stays visible on scroll without overlapping the header; start flow + toast verified

**Checkpoint**: A not-started day shows the pinned start card; starting works with toast feedback and reconciles a 409.

---

## Phase 5: User Story 3 - Complete today's workout session (Priority: P1)

**Goal**: When a session is in progress, a bottom bar shows "Marcar como concluído" (pinned, not overlapping the bottom nav). Completing shows a toast, hides the bar, and shows a "Finalizado!" success badge where the start action was; the completed state persists on reload. Matches Figma `3606-790`.

**Independent Verification**: With an in-progress session, the pinned bottom bar is visible above the nav; tapping shows a success toast, hides the bar, and shows the "Finalizado!" badge. Re-opening a completed day shows the badge and neither control.

- [X] T017 [US3] Add `completeWorkoutSessionAction({ workoutPlanId, workoutDayId, sessionId })` to `actions.ts` wrapping the generated `completeWorkoutSession`; return `{ ok: true }` on 200, `{ ok: false }` otherwise
- [X] T018 [US3] Extend `_components/workout-session-actions.tsx`: for IN_PROGRESS render the `fixed` bottom "Marcar como concluído" bar offset above the fixed bottom nav (no overlap, FR-011) and pad content so the list clears it; for COMPLETED render the `Badge` `success` "Finalizado!" in the start-action slot and hide both controls (depends on T014)
- [X] T019 [US3] Wire the complete button through `useTransition` with a disabled-while-pending guard, `toast.success`/`toast.error`, and `router.refresh()` on success (depends on T017, T018)
- [ ] T020 [US3] Pull Figma node `3606-790` and validate with chrome-devtools MCP at 320px and 1280px: bottom bar never overlaps the nav; complete flow, "Finalizado!" badge, and completed-on-reload state verified

**Checkpoint**: Full start→complete→finished loop works with toasts; completed state survives reload.

---

## Phase 6: User Story 4 - Guard against invalid direct access (Priority: P2)

**Goal**: Reaching the screen for a non-existent day, or a rest day, redirects to home before render; logged-out users go to login.

**Independent Verification**: Direct navigation to an invalid plan/day URL → redirect to `/`; a rest day (`isRest = true`) → redirect to `/`; logged out → redirect to `/login`.

- [X] T021 [US4] In `page.tsx`, after fetching, `redirect('/')` when `getWorkoutDay` status ≠ 200 OR the resolved day `isRest === true`, before rendering any UI (depends on T008)
- [X] T022 [US4] Manually verify against acceptance scenarios: invalid plan/day → `/`; rest day → `/`; unauthenticated direct access → `/login` (via existing `proxy.ts`/`getUser`)

**Checkpoint**: The screen never renders in a broken/empty state; all guard paths redirect correctly.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T023 [P] Run `npm run lint` in `packages/backend` and `packages/web`, and `npm run build` in `packages/web`; fix any issues
- [X] T024 [P] UX consistency pass: confirm shadcn/ui + tokens only (no hardcoded colors), copy tone matches Fit.ai, loading/empty/error states are coherent with existing pages
- [ ] T025 Run the full `quickstart.md` validation (scenarios S1–S7) at 320px and 1280px; confirm no console errors or failed network requests

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: independent of Phase 1; **blocks US2 and US3** (session data). US1 does not depend on it.
- **US1 (Phase 3)**: depends only on the route existing; can start right away (parallel with Phase 1/2).
- **US2 (Phase 4)**: depends on Phase 1 (sonner) + Phase 2 (session field) + US1 page shell (T008).
- **US3 (Phase 5)**: depends on Phase 1 (badge/sonner) + Phase 2 + US2 island (T014).
- **US4 (Phase 6)**: depends on US1 page (T008).
- **Polish (Phase 7)**: after all targeted stories are complete.

### Story dependencies

- US1 → independent (MVP).
- US2 → shares `actions.ts`/island with US3; needs backend session field.
- US3 → builds on US2's island and actions file (same files → not parallel with US2).
- US4 → augments US1's page with redirect guards.

### Within a story

- Backend schema/use-case before Orval regen before frontend consumption.
- Server action before the island wiring that calls it.
- Component build before Figma/responsive validation.

### Parallel opportunities

- Phase 1: T002, T003, T004 in parallel (T001 first for sonner import in T003).
- Phase 2 can run in parallel with Phase 1 and with US1 (different files/packages).
- US1: T009 and T010 in parallel (different files); T008/T011 sequential.
- US2 and US3 touch the **same** files (`actions.ts`, `workout-session-actions.tsx`) — do NOT parallelize across those two stories.

---

## Parallel Example: Phase 1 + US1 kickoff

```bash
# After T001 (sonner installed), these touch different files:
Task: "T002 Add badge component in packages/web/src/components/ui/badge.tsx"
Task: "T004 Add --success token in packages/web/src/app/globals.css"
Task: "T009 Create workout-day-header.tsx in the route _components dir"
Task: "T010 Create exercise-list.tsx in the route _components dir"
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Do Phase 1 (Setup) — or defer T001/T003 until US2.
2. Complete US1 (T008–T012).
3. **STOP and VALIDATE**: verify the view-only screen against US1 acceptance scenarios and Figma `3606-679`.
4. Demo the navigable, faithful workout screen.

### Incremental delivery

1. US1 → view-only screen (MVP).
2. Foundational (Phase 2) + US2 → start flow with toasts.
3. US3 → complete flow, "Finalizado!" badge.
4. US4 → redirect guards.
5. Polish → lint/build + full quickstart validation.

---

## Notes

- Constitution forbids automated tests — none are included; all verification is manual.
- Never hand-edit `packages/web/src/lib/api/fetch-generated/`; always regenerate via `npx orval` after backend contract changes.
- Read the relevant `node_modules/next/dist/docs/` pages (Server Actions, `redirect`) before writing `page.tsx`/`actions.ts` (per `packages/web/AGENTS.md`).
- Every frontend task is "done" only after chrome-devtools MCP validation at 320px and 1280px with no console/network errors.
- Commit after each task or logical group.
