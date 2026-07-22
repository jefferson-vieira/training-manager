# Phase 1 Data Model: Exercise Help via Coach AI

This feature persists no data and changes no database schema. The only "model" is
transient client-side UI state held by `CoachProvider`.

## Transient client state (CoachProvider) — Amendment 2 shape

| Field | Type | Description |
|-------|------|-------------|
| `chat` | `Chat<UIMessage>` | Shared AI SDK chat instance (created once via `lib/chat.ts` `createCoachChat({ onUnauthorized })`); holds the conversation messages so they persist across drawer close/open and route changes. |
| `drawerHandle` | `DrawerHandle` (base-ui `DialogHandle`) | Imperative handle passed to the (uncontrolled) coach `Drawer`; `drawerHandle.open(null)` surfaces the drawer from anywhere in the `(protected)` tree. |

### Hooks

| Hook | Returns | Purpose |
|------|---------|---------|
| `useCoach()` | `{ chat, drawerHandle }` | Access the shared instance and the drawer handle. |
| `useCoachChat()` | `useChat({ chat })` helpers (`messages`, `sendMessage`, `status`, …) | The single way components read/write the shared conversation. |

### Send flow (no queue)

The help button composes the question with `buildExerciseHelpQuestion(name)` and,
in its `onClick`, calls `sendMessage({ text })` followed by
`drawerHandle.open(null)`. There is no pending-message state, effect, or dedupe —
one tap, one send, structurally.

### Invariants (Amendment 2)
- The conversation persists across drawer close/open because messages live in the
  shared `chat` instance, not in `ChatPanel` — the panel may unmount freely.
- The provider lives in the `(protected)` route-group layout, above both
  `onboarding` and `(main)`; onboarding and the coach drawer share the same
  instance, so one continuous conversation spans onboarding → app (soft
  navigation keeps the group layout, and thus the instance, alive).

## Referenced existing entities (unchanged)

- **Exercise** (`GetWorkoutDay200ExercisesItem`): only `name` is read, used verbatim
  to compose the question. No new fields.
- **Coach AI conversation** (shared `Chat` instance messages, read via
  `useCoachChat()`): the help question is appended as a normal user message;
  message shape is unchanged.

## Derived copy rule

- `buildExerciseHelpQuestion(name: string): string` →
  `` `Como executar o exercício ${name} corretamente?` `` (lives in
  `packages/web/src/helpers/exercise-help.ts`).
