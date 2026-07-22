# Implementation Plan: Exercise Help via Coach AI

**Branch**: `006-exercise-help-chat` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-exercise-help-chat/spec.md`

## Summary

Wire the existing per-exercise "Ajuda sobre o exercício" button (already present in
`exercise-list.tsx:24`) so that tapping it opens the global Coach AI drawer and
submits the message `Como executar o exercício <nome> corretamente?` into the
existing (preserved) conversation. Frontend-only; no backend, API, or Orval
changes. The page-level button and the drawer (`components/chat.tsx`) live in
separate subtrees of the `(main)` layout, so they communicate through a small
client-side React Context (`CoachProvider`) that holds the drawer `open` flag and
a transient `pendingMessage`. `ChatPanel` sends the pending message via its
existing `useChat` `sendMessage` once the conversation is ready, then clears it.

## Technical Context

**Language/Version**: TypeScript (Node v24.14.0 per `.nvmrc`)

**Primary Dependencies**: Next.js 16 + React 19 + Tailwind 4 + shadcn (web); Coach AI via `@ai-sdk/react` `useChat` against `/api/ai`. No new dependencies.

**Storage**: None for this feature (no persistence; transient client state only)

**Testing**: **NONE** — Constitution Principle I forbids all automated tests. Manual verification only (chrome-devtools MCP).

**Target Platform**: Web (responsive mobile 320px + desktop 1280px+)

**Project Type**: npm workspaces monorepo — change confined to `packages/web`

**Performance Goals**: No new network calls beyond the existing AI stream; open + message-visible under 2s (SC-001). No added client bundle of note (Context + hook only).

**Constraints**: Reuse existing Coach AI overlay and `useChat` behavior (FR-008); preserve conversation across close/open (FR-009); touch target ≥ 44px (FR-007); business logic (question copy) out of the component per constitution.

**Scale/Scope**: Single feature slice — ~1 new provider/hook, 1 helper, edits to `chat.tsx`, `chat-panel.tsx`, `exercise-list.tsx`, and `(main)/layout.tsx`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **No Automated Testing**: Plan includes zero test tasks, test infra, or test frameworks
- [x] **Code Quality**: Question-copy composition lives in a `src/helpers/` utility; state logic in a dedicated context/hook, not inlined business logic in components
- [x] **UX Consistency**: Reuses existing `Button`, `Drawer`, and `ChatPanel`; no new chat surface; existing error/loading states reused (FR-005)
- [x] **Responsive Design**: Help button remains in the exercise row; touch target raised to ≥ 44px; verified at 320px and 1280px
- [x] **Minimal Dependencies**: Zero new npm packages — React Context + existing `useChat`
- [x] **Performance**: No extra endpoints/queries; reuses the streaming AI route; provider adds negligible client cost
- [x] **Package Rules**: All changes in `packages/web`; no API contract change → no Orval regen needed

**Result**: PASS (no violations; Complexity Tracking not required).

## Project Structure

### Documentation (this feature)

```text
specs/006-exercise-help-chat/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (transient client state shape)
├── quickstart.md        # Phase 1 output (manual validation guide)
├── contracts/           # Phase 1 — N/A (no external interface change; see research.md)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (files touched, all under `packages/web/src`)

```text
packages/web/src/
├── app/(main)/
│   ├── layout.tsx                                   # wrap children + BottomNav in <CoachProvider>
│   └── workout-plans/[workoutPlanId]/days/[workoutDayId]/
│       └── _components/exercise-list.tsx            # wire help Button onClick → useCoach().askAboutExercise(name)
├── components/
│   ├── chat.tsx                                     # controlled Drawer via CoachProvider; pass pendingMessage to ChatPanel
│   ├── chat-panel.tsx                               # accept pendingMessage + onPendingMessageSent; send when ready
│   └── coach-provider.tsx                           # NEW: CoachProvider + useCoach() (open + pendingMessage state)
└── helpers/
    └── exercise-help.ts                             # NEW: buildExerciseHelpQuestion(name)
```

**Structure Decision**: Confine everything to `packages/web`. Share drawer state via a
React Context scoped to the `(main)` layout (the smallest subtree containing both
the page's exercise list and the `BottomNav`/`Chat`). Onboarding uses `ChatPanel`
directly (not `Chat`) and is untouched.

## Key Design Decisions

1. **State-sharing mechanism → React Context (`CoachProvider`)**, not nuqs query
   params. Both consumers sit inside the `(main)` layout, the message is transient
   and not worth encoding in the URL, and a controlled `open` + `pendingMessage`
   pair keeps the conversation mounted/persisted (FR-009). See research.md for the
   nuqs alternative and why it was rejected.

2. **Drawer becomes controlled**: `Chat` reads `open`/`setOpen` from `useCoach()`
   and keeps its existing `DrawerTrigger` for manual open. `askAboutExercise(name)`
   sets `pendingMessage` and `open = true`.

3. **Message dispatch inside `ChatPanel`**: an effect sends `pendingMessage` via the
   existing `sendMessage` only when `status === 'ready'` (deferring while busy),
   then calls `onPendingMessageSent()` to clear it — reusing the exact same send
   path as typed messages (FR-005) and appending to the existing thread (FR-009).

4. **Question copy in a helper**: `buildExerciseHelpQuestion(name)` returns
   `Como executar o exercício ${name} corretamente?`, keeping the fixed domain copy
   out of the component (constitution: business rules in `helpers/`).

## Amendment — Conversation persistence via shared `Chat` instance (2026-07-22)

**Input**: "para impedir o chat de resetar, faça como no guia
<https://ai-sdk.dev/resources/recipes/next/use-shared-chat-context>"

**Supersedes**: Key Design Decision on drawer mounting and research.md R3
(`keepMounted`). The `keepMounted` approach kept `ChatPanel` mounted so its
internal `useChat` state survived; the user reverted it in favor of the official
AI SDK pattern: hoist a single `Chat` instance (from `@ai-sdk/react`) into React
context and pass it to `useChat({ chat })`. Messages then live in the shared
instance — `ChatPanel` can unmount/remount freely and the conversation persists.

Verified against installed `@ai-sdk/react@3.0.118`: `Chat<UIMessage>` is exported
and `UseChatOptions` accepts `{ chat: Chat<UI_MESSAGE> }`.

### Design (revised: `(protected)` route group, chat shared with onboarding)

> Revision input: "crie um grupo protected para as rotas com o layout que terá o
> contexto do chat, assim preserva o chat entre o onboarding e o resto das páginas
> sem quebrar o layout compartilhado." The provider moves above both `(main)` and
> `onboarding`, so the onboarding conversation carries into the app's coach drawer.

1. **Chat factory (infrastructure)** — new `packages/web/src/lib/coach-chat.ts`:
   `createCoachChat(onUnauthorized: () => void): Chat<UIMessage>` building
   `new Chat({ transport: new DefaultChatTransport({...}) })` with the exact
   transport config previously inlined in `chat-panel.tsx` (env API URL,
   `credentials: 'include'`, 401 → `onUnauthorized()`). Lives in `lib/` because it
   is API-client infrastructure (constitution: `lib/` = infrastructure).

2. **`(protected)` route group hosts the provider** — restructure `src/app/`:

   ```text
   src/app/
   ├── (auth)/login/…                # public — unchanged
   ├── (protected)/
   │   ├── layout.tsx                # NEW — <CoachProvider>{children}</CoachProvider>
   │   ├── (main)/…                  # moved from app/(main)/ — bottom-nav shell only
   │   └── onboarding/page.tsx       # moved from app/onboarding/
   └── layout.tsx                    # root — unchanged
   ```

   Route groups don't affect URLs (`/`, `/onboarding`, … unchanged) and `proxy.ts`
   already guards everything except `/login` — no proxy change. Next.js keeps the
   `(protected)` layout mounted across soft navigations inside the group, so the
   provider — and the chat — survive onboarding → app navigation without touching
   the `(main)` shared layout (bottom nav).

3. **`CoachProvider` owns the shared instance** — `coach-provider.tsx` adds
   `chat: Chat<UIMessage>` to the context value, created once via
   `useState(() => createCoachChat(() => router.push('/login')))`. Also restores
   the pieces disabled during experimentation: `createContext` default back to
   `null` and the `useCoach` guard re-enabled.

4. **`ChatPanel` consumes an injected chat** — required prop
   `chat: Chat<UIMessage>`, used as `useChat({ chat })`. The inline transport
   block (and its `useRouter`/`env`/`DefaultChatTransport` imports) moves to the
   factory. No local-instance fallback: every `ChatPanel` consumer now sits inside
   the provider.

5. **Consumers pass the shared instance** — `chat.tsx` and the onboarding page
   read `chat` from `useCoach()` and forward it to `ChatPanel`. Same instance ⇒
   one continuous conversation across onboarding and the coach drawer.
   `keepMounted` is dropped from `chat.tsx` and the leftover prop removed from
   `ui/drawer.tsx` (dead code).

6. **Unchanged**: `pendingMessage` open+send flow, dispatch-dedupe ref,
   `askAboutExercise`, help button, `linkSafety`, backend. FR-009 is now satisfied
   by the shared instance instead of by mounting behavior.

### Constitution re-check (amendment)

- [x] No tests; manual verification via quickstart V4
- [x] Zero new dependencies (`Chat` class ships with the already-installed `@ai-sdk/react`)
- [x] Transport/factory in `lib/` (infrastructure), state in provider — no logic in components
- [x] Onboarding unaffected (own local instance, same factory)
- [x] Removes dead code (`keepMounted` prop) rather than accumulating it

**Result**: PASS.

## Amendment 2 — Uncontrolled drawer + `useCoachChat` + direct send (2026-07-22)

**Input**: "remover o modo controlado do drawer do chat e mover o useChat para um
hook custom `useCoachChat` que consome o contexto de chat. Com isso também pode
remover o ciclo de useEffect do pendingMessage e chamar diretamente o
`sendMessage` do `useCoachChat` para enviar a mensagem."

**Supersedes** (from Amendment 1): the controlled `open` state, `pendingMessage`
queue, its send-when-ready effect + dedupe ref, and the `chat` prop drilling into
`ChatPanel`.

### Key enabler (verified in installed `@base-ui/react@1.6.0`)

`Drawer.createHandle()` returns a `DialogHandle` with imperative `open(triggerId)`,
`close()`, and `isOpen`. Passing it to `Drawer.Root`'s `handle` prop lets external
code open an otherwise **uncontrolled** drawer (docs: "should only be called in an
event handler or an effect"). This removes any need for controlled `open` state.

### Design

1. **`CoachProvider` slims down** (`components/coach-provider.tsx`): context value
   becomes `{ chat, drawerHandle }` — the shared `Chat<UIMessage>` (unchanged) plus
   a `drawerHandle` created once via `useState(() => createDrawerHandle())`.
   `open`, `setOpen`, `pendingMessage`, `clearPendingMessage`, and
   `askAboutExercise` are all removed. The `useMemo` value becomes fully stable.

2. **`useCoachChat()` custom hook** — colocated in `coach-provider.tsx` (matching
   the existing `useCoach` colocation; no `hooks/` dir exists in this codebase):

   ```ts
   export function useCoachChat() {
     const { chat } = useCoach();
     return useChat({ chat });
   }
   ```

3. **`ui/drawer.tsx` re-exports the handle API** — `createDrawerHandle`
   (`DrawerPrimitive.createHandle`) and the `DrawerHandle` type
   (`DrawerPrimitive.Handle`), keeping base-ui encapsulated behind the design
   system as with the other drawer parts.

4. **`chat.tsx` back to uncontrolled** — remove `open`/`setOpen` wiring; keep the
   `DrawerTrigger` and the `router.refresh()`-on-close logic (`onOpenChange` still
   fires for uncontrolled drawers). Pass `handle={drawerHandle}` from `useCoach()`
   to `Drawer`. Drop `pendingMessage`/`onPendingMessageSent`/`chat` props from the
   `ChatPanel` usage.

5. **`ChatPanel` uses the hook** (`components/chat-panel.tsx`): replace the `chat`
   prop + `useChat({ chat })` with `useCoachChat()`; delete the `pendingMessage` /
   `onPendingMessageSent` props, the send effect, and the dispatch ref. The
   onboarding page also stops passing `chat` (and drops its `useCoach` usage).

6. **`ExerciseHelpButton` sends directly**
   (`…/_components/exercise-help-button.tsx`):

   ```tsx
   const { drawerHandle } = useCoach();
   const { sendMessage, status } = useCoachChat();
   // onClick:
   if (status !== 'ready') return drawerHandle.open(null); // busy: just surface the drawer
   sendMessage({ text: buildExerciseHelpQuestion(exerciseName) });
   drawerHandle.open(null);
   ```

   The busy guard mirrors the existing `handleSubmit`/`handleSuggestion` pattern in
   `ChatPanel` (no send while a response streams — reachable by closing the drawer
   mid-stream and tapping another help button). The event handler runs once per
   tap — the Strict-Mode double-send class of bugs disappears structurally. The
   question copy stays in `helpers/exercise-help.ts`.

### Behavior notes

- FR-002 (auto-open) now satisfied by `drawerHandle.open(null)`; FR-003/FR-005 by
  the direct `sendMessage` on the shared instance (identical send path); FR-009
  persistence unchanged (messages live in the shared `Chat` instance).
- Sending while the panel is closed is safe: `sendMessage` belongs to the `Chat`
  instance itself; the panel subscribes on mount and renders the in-flight stream.
- Minor perf note: `useCoachChat` in each help button subscribes those buttons to
  chat re-renders during streaming; acceptable at this scale (see research.md R7
  for the `chat.sendMessage` instance-call alternative if it ever matters).

### Constitution re-check (Amendment 2)

- [x] No tests; manual verification per quickstart
- [x] Zero new dependencies (handle API ships with installed base-ui)
- [x] Logic in hooks/helpers (`useCoachChat`, `buildExerciseHelpQuestion`); components only orchestrate
- [x] Net code deletion (pendingMessage cycle, controlled state, prop drilling removed)
- [x] Design-system encapsulation preserved (handle re-exported via `ui/drawer.tsx`)

**Result**: PASS.

## Complexity Tracking

> No Constitution Check violations — section intentionally empty.
