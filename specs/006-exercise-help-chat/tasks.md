---

description: "Task list for Exercise Help via Coach AI"
---

# Tasks: Exercise Help via Coach AI

**Input**: Design documents from `/specs/006-exercise-help-chat/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: **FORBIDDEN** — Constitution Principle I prohibits all automated tests. No test tasks are included.

**Organization**: One user story (US1, P1). Foundational plumbing enables the story; the story itself is the button wiring + manual verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story the task belongs to (US1)
- Exact file paths are included in each task.

## Path Conventions

- **Web only**: `packages/web/src/` — no backend, no API contract, no Orval regen for this feature.

---

## Phase 1: Setup

**Purpose**: No new project setup, dependencies, or tooling required — the feature reuses the existing web stack (`@ai-sdk/react`, shadcn `Drawer`, React Context). Proceed directly to Foundational.

*(No tasks.)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared client-state plumbing that must exist before the help button can open the drawer and inject a message.

**⚠️ CRITICAL**: US1 cannot function until this phase is complete.

- [X] T001 [P] Create the question-copy helper `buildExerciseHelpQuestion(name: string): string` returning `` `Como executar o exercício ${name} corretamente?` `` in `packages/web/src/helpers/exercise-help.ts`
- [X] T002 Create `CoachProvider` + `useCoach()` hook in `packages/web/src/components/coach-provider.tsx` holding `open` and `pendingMessage` state and exposing `setOpen(open)`, `askAboutExercise(name)` (sets `pendingMessage = buildExerciseHelpQuestion(name)` and `open = true`), and `clearPendingMessage()` (depends on T001)
- [X] T003 Wrap `children` and `BottomNav` with `<CoachProvider>` in `packages/web/src/app/(main)/layout.tsx` so both the workout day page and the Coach drawer share the context (depends on T002)
- [X] T004 [P] Add optional `pendingMessage?: string | null` and `onPendingMessageSent?: () => void` props to `ChatPanel` and add an effect that calls `sendMessage({ text: pendingMessage })` only when `pendingMessage` is set and `status === 'ready'`, then calls `onPendingMessageSent()` — reusing the existing send path — in `packages/web/src/components/chat-panel.tsx`
- [X] T005 Convert the `Chat` drawer to controlled via `useCoach()` in `packages/web/src/components/chat.tsx`: set `Drawer` `open`/`onOpenChange` from context (preserve the existing `router.refresh()` on close), keep the manual `DrawerTrigger`, and pass `pendingMessage` + `onPendingMessageSent={clearPendingMessage}` to `ChatPanel` (depends on T002, T004)

**Checkpoint**: The drawer can be opened programmatically and will send a queued message into the existing conversation.

---

## Phase 3: User Story 1 - Get help executing an exercise (Priority: P1) 🎯 MVP

**Goal**: Tapping an exercise's help control opens the Coach AI and submits `Como executar o exercício <nome> corretamente?` for that exact exercise, into the preserved conversation.

**Independent Verification**: On a workout day with multiple exercises, tap a row's help control and confirm the drawer opens with a user message naming that exact exercise, followed by the streamed coach answer (quickstart V1–V3).

### Implementation for User Story 1

- [X] T006 [US1] Create a client component `ExerciseHelpButton` (props: `exerciseName: string`) that renders the existing ghost `Button` with `CircleHelp` icon and `aria-label="Ajuda sobre o exercício"`, calling `useCoach().askAboutExercise(exerciseName)` in `onClick`, in `packages/web/src/app/(main)/workout-plans/[workoutPlanId]/days/[workoutDayId]/_components/exercise-help-button.tsx`
- [X] T007 [US1] Replace the inline help `Button` (currently `exercise-list.tsx:24`) with `<ExerciseHelpButton exerciseName={exercise.name} />`, keeping `exercise-list.tsx` a Server Component, in `packages/web/src/app/(main)/workout-plans/[workoutPlanId]/days/[workoutDayId]/_components/exercise-list.tsx`
- [X] T008 [US1] Manually verify quickstart V1–V4 (opens drawer, correct exercise name, streamed response, conversation appended/preserved across close/open) on a workout day with multiple exercises

**Checkpoint**: US1 is fully functional and independently verifiable — this is the shippable MVP.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Compliance and validation across the feature.

- [X] T009 [US1] Ensure the help control's touch target is ≥ 44×44px (FR-007) in `packages/web/src/app/(main)/workout-plans/[workoutPlanId]/days/[workoutDayId]/_components/exercise-help-button.tsx`; adjust button size/padding if under, without breaking row layout
- [X] T010 Verify conversation persistence across close/open (quickstart V4); if the conversation resets, add `keepMounted` to the drawer portal in `packages/web/src/components/ui/drawer.tsx` per research.md R3, then re-verify
- [X] T011 Run full quickstart.md validation via chrome-devtools MCP: scenarios V5–V6, responsive at 320px and 1280px (SC-004), SC-001 (<2s), and check console errors + failed network requests
- [X] T012 [P] Run `cd packages/web && npm run lint` and fix any issues introduced by the change

---

## Phase 5: Amendment — Shared `Chat` instance + `(protected)` route group (Foundational)

**Purpose**: Replace the reverted `keepMounted` persistence with the AI SDK
shared-chat-context pattern (plan.md Amendment), hosting the provider in a
`(protected)` route group so the conversation carries from onboarding into the
app. Tasks already applied on disk are pre-checked.

- [X] T013 Create chat factory `createCoachChat(onUnauthorized)` (transport: env API URL, `credentials: 'include'`, 401 → callback) in `packages/web/src/lib/coach-chat.ts`
- [X] T014 Finalize `CoachProvider`: add shared `chat: Chat<UIMessage>` via `useState(() => createCoachChat(() => router.push('/login')))`, restore `createContext` default `null` and the `useCoach` guard, in `packages/web/src/components/coach-provider.tsx`
- [X] T015 Create route group: `git mv "src/app/(main)" "src/app/(protected)/(main)"`, `git mv src/app/onboarding "src/app/(protected)/onboarding"`, and add `packages/web/src/app/(protected)/layout.tsx` rendering `<CoachProvider>{children}</CoachProvider>`
- [X] T016 Remove the commented-out `CoachProvider` import/JSX remnants from `packages/web/src/app/(protected)/(main)/layout.tsx`, leaving only the bottom-nav shell
- [X] T017 Rework `ChatPanel`: required `chat: Chat<UIMessage>` prop, `useChat({ chat })`, and remove the now-unused inline `DefaultChatTransport` config plus `useRouter`/`env` imports, in `packages/web/src/components/chat-panel.tsx`
- [X] T018 [P] Pass `chat` from `useCoach()` to `ChatPanel` and remove the obsolete `keepMounted` prop from `DrawerContent`, in `packages/web/src/components/chat.tsx` (depends on T017)
- [X] T019 [P] Pass `chat` from `useCoach()` to the onboarding `ChatPanel` in `packages/web/src/app/(protected)/onboarding/page.tsx` (depends on T017)
- [X] T020 [P] Remove the dead `keepMounted` prop from `DrawerContent`'s signature in `packages/web/src/components/ui/drawer.tsx`

**Checkpoint**: App compiles; one shared conversation instance spans onboarding and the coach drawer.

---

## Phase 6: Amendment — Verification (US1)

- [X] T021 [US1] Run `npx eslint` on all files changed in Phase 5 and `npx tsc --noEmit` in `packages/web`; fix any issues
- [X] T022 [US1] Re-verify quickstart V1–V4 via chrome-devtools MCP: help button opens drawer, sends the exercise question exactly once (Strict Mode), response streams, and the conversation persists across drawer close/open
- [ ] T023 [US1] (partially verified — blocked: onboarding has no soft-nav into the app today, see note below) Verify quickstart V7 via chrome-devtools MCP: chat on `/onboarding`, soft-navigate into the app, open the coach drawer and see the onboarding messages; confirm all route URLs unchanged (`/`, `/onboarding`, `/workout-plan`, `/stats`, `/profile`, `/workout-plans/…`) and logged-out `/login` redirect still works; console free of new errors

**Checkpoint**: FR-009 satisfied via the shared instance; amendment complete.

---

## Phase 7: Amendment 2 — Uncontrolled drawer + `useCoachChat` + direct send (Foundational)

**Purpose**: Delete the controlled-drawer state and the `pendingMessage` queue
(plan.md Amendment 2): the drawer opens via base-ui's imperative handle
(`Drawer.createHandle()`), and the help button sends directly through a new
`useCoachChat()` hook (wrapper of `useChat({ chat })`).

- [X] T024 Re-export the drawer handle API from the design system: `createDrawerHandle` (= `DrawerPrimitive.createHandle`) and type `DrawerHandle` (= `DrawerPrimitive.Handle`) in `packages/web/src/components/ui/drawer.tsx`
- [X] T025 Slim `CoachProvider` to `{ chat, drawerHandle }` (create `drawerHandle` once via `useState(() => createDrawerHandle())`; delete `open`, `setOpen`, `pendingMessage`, `clearPendingMessage`, `askAboutExercise`) and add the `useCoachChat()` hook returning `useChat({ chat })`, in `packages/web/src/components/coach-provider.tsx` (depends on T024)
- [X] T026 Rework `ChatPanel` to call `useCoachChat()`: remove the `chat`, `pendingMessage`, and `onPendingMessageSent` props, the send-when-ready effect, and the `pendingMessageDispatched` ref, in `packages/web/src/components/chat-panel.tsx` (depends on T025)
- [X] T027 [P] Revert `Chat` to an uncontrolled drawer: remove `open`/`setOpen` usage, pass `handle={drawerHandle}` from `useCoach()` to `Drawer`, keep `DrawerTrigger` and the `router.refresh()`-on-close logic in `onOpenChange`, and drop the `chat`/`pendingMessage`/`onPendingMessageSent` props from the `ChatPanel` usage, in `packages/web/src/components/chat.tsx` (depends on T025, T026)
- [X] T028 [P] Remove the `useCoach()` usage and `chat` prop from the onboarding `ChatPanel` in `packages/web/src/app/(protected)/onboarding/page.tsx` (depends on T026)
- [X] T029 [P] Rework `ExerciseHelpButton`: `const { drawerHandle } = useCoach(); const { sendMessage, status } = useCoachChat();` — in `onClick`, if `status !== 'ready'` only call `drawerHandle.open(null)` (busy guard), else `sendMessage({ text: buildExerciseHelpQuestion(exerciseName) })` then `drawerHandle.open(null)`, in `packages/web/src/app/(protected)/(main)/workout-plans/[workoutPlanId]/days/[workoutDayId]/_components/exercise-help-button.tsx` (depends on T025)

**Checkpoint**: No pendingMessage/controlled-open state remains; one tap = one direct send + imperative open.

---

## Phase 8: Amendment 2 — Verification (US1)

- [X] T030 [US1] Run `npx eslint` on all Phase 7 files and `npx tsc --noEmit` in `packages/web` (ignore stale `.next/types` until dev-server restart); fix any issues
- [X] T031 [US1] Re-verify quickstart V1–V5 via chrome-devtools MCP: help button opens drawer + sends the exact question once, response streams, conversation persists across close/open and across soft navigation (drawer ↔ home), busy-guard behavior per V5, console free of new errors

**Checkpoint**: Amendment 2 verified; behavior identical to spec with less state.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None (empty).
- **Foundational (Phase 2)**: Blocks US1.
- **User Story 1 (Phase 3)**: Depends on Foundational completion.
- **Polish (Phase 4)**: Depends on US1 completion.
- **Amendment Foundational (Phase 5)**: Supersedes the persistence mechanism from Phases 2–4; T016 → T017 → {T018, T019}; T020 independent.
- **Amendment Verification (Phase 6)**: Depends on Phase 5 completion (T021 → T022 → T023).
- **Amendment 2 Foundational (Phase 7)**: Supersedes the controlled-open/pendingMessage mechanism from Phases 2 and 5; T024 → T025 → T026 → {T027, T028}; T029 after T025 (∥ with T026–T028).
- **Amendment 2 Verification (Phase 8)**: Depends on Phase 7 completion (T030 → T031).

### Task-level dependencies

- T001 → T002 → {T003, T005}
- T004 → T005
- {T002, T003} → T006 (button needs `useCoach` + provider in the layout tree)
- T006 → T007 → T008
- T008 → T009, T010, T011

### Parallel Opportunities

- **T001** and **T004** can run in parallel (different files, no shared dependency).
- **T012** (lint) can run in parallel with manual verification tasks once code changes are in.
- Single-story feature — no cross-story parallelism.

---

## Parallel Example: Foundational

```bash
# Independent files, run together:
Task T001: "Create buildExerciseHelpQuestion helper in packages/web/src/helpers/exercise-help.ts"
Task T004: "Add pendingMessage props + send-when-ready effect in packages/web/src/components/chat-panel.tsx"
```

---

## Implementation Strategy

### MVP (recommended)

1. Phase 2: Foundational (T001–T005).
2. Phase 3: US1 (T006–T008) → **STOP and VALIDATE** against acceptance scenarios.
3. Ship — this is the complete feature value.
4. Phase 4: Polish (T009–T012) to close out FR-007, persistence verification, and full quickstart/responsive checks.

---

## Notes

- Frontend-only: no backend, schema, DTO, or Orval regeneration.
- [P] tasks = different files, no dependencies.
- Business/domain copy lives in `helpers/`; state logic lives in the provider/hook — not inlined in components (Constitution II).
- Constitution forbids automated tests — verification is manual (chrome-devtools MCP).
- Commit after each task or logical group.
