# Phase 0 Research: Exercise Help via Coach AI

## R1. How should the page-level help button communicate with the global Coach AI drawer?

**Decision**: A client-side React Context (`CoachProvider`) scoped to the `(main)`
layout, exposing `open`, `setOpen`, `pendingMessage`, and `askAboutExercise(name)`
via a `useCoach()` hook.

**Rationale**:
- `Chat` (the drawer) is rendered inside `BottomNav`, and the workout day page
  (with `exercise-list.tsx`) is rendered as `children` — both are siblings under
  `app/(main)/layout.tsx`. A provider wrapping that layout covers both with the
  smallest possible scope.
- The Coach AI conversation state lives inside `ChatPanel` via `useChat`. Keeping
  the drawer mounted and only toggling a controlled `open` flag preserves the
  conversation across close/open (FR-009), which the user confirmed is the current
  behavior.
- Zero new dependencies (Constitution V). Uses React built-ins only.

**Alternatives considered**:
- **nuqs query params** (the mechanism CLAUDE.md documents for the overlay). Rejected:
  the current `chat.tsx` no longer uses nuqs (the drawer rebuild made it
  uncontrolled), the help message is transient and not meaningfully shareable/
  bookmarkable, and encoding dynamic message text in the URL (plus clearing it to
  avoid re-sends and history spam) is more moving parts than a Context. nuqs remains
  available if URL-driven deep-linking is later required.
- **Custom DOM event / event emitter**. Rejected: less type-safe and idiomatic than
  Context; harder to reason about lifecycle and React state updates.
- **Lifting `useChat` into a shared context**. Rejected: larger blast radius; the
  drawer already owns the conversation and only needs a message injected.

## R2. How is the pending message delivered into the existing conversation?

**Decision**: `ChatPanel` accepts optional `pendingMessage` + `onPendingMessageSent`
props. An effect calls the existing `sendMessage({ text: pendingMessage })` when
`status === 'ready'`, then invokes `onPendingMessageSent()` to clear it.

**Rationale**:
- Reuses the identical send path as typed messages and suggestions, so streaming,
  tools, and error handling are unchanged (FR-005).
- Gating on `status === 'ready'` defers the send if a previous response is still
  streaming, cleanly covering the "already busy" edge case without special logic.
- Clearing after send prevents duplicate submissions on re-render.

**Alternatives considered**:
- Exposing a `ref`/imperative handle from `ChatPanel`. Rejected: props + effect is
  simpler and avoids imperative escape hatches.

## R3. Does the Coach AI conversation actually persist across close/open today?

**Decision**: Treat persistence as the required behavior (FR-009); verify during
manual validation. If Base UI's drawer unmounts `ChatPanel` on close (losing
`useChat` state), add `keepMounted` to the drawer portal so the panel stays mounted.

**Rationale**: The user stated the conversation is already preserved across
close/open. The controlled-`open` approach does not change mount behavior, so it
keeps whatever persistence exists today. The quickstart includes an explicit check
so a wrong assumption is caught early rather than shipped.

## R6. (Supersedes R3) Conversation persistence via shared `Chat` instance

**Decision**: Follow the official AI SDK recipe
(<https://ai-sdk.dev/resources/recipes/next/use-shared-chat-context>): create one
`Chat<UIMessage>` instance (exported by `@ai-sdk/react`) in `CoachProvider` and
pass it to `useChat({ chat })` in `ChatPanel`. Conversation state lives in the
instance, not the component, so it survives drawer close/open without keeping the
panel mounted. The `keepMounted` approach from R3 is reverted (drawer prop removed).

**Placement (revised)**: the provider lives in a new `(protected)` route group
layout (`app/(protected)/layout.tsx`) that wraps both `(main)` and `onboarding`.
Next.js keeps a group's layout mounted across soft navigations inside it, so the
shared instance survives onboarding → app navigation; route groups don't change
URLs, and `proxy.ts` already protects everything except `/login`.

**Rationale**:
- User-directed, and it is the AI SDK's idiomatic pattern for sharing chat state
  across components/mounts (verified supported by installed `@ai-sdk/react@3.0.118`:
  `UseChatOptions = { chat: Chat } | ChatInit`).
- Decouples persistence from base-ui drawer internals; `keepMounted` kept the whole
  panel in the DOM permanently and depended on portal behavior.
- Onboarding shares the same conversation (user-directed): the plan created during
  onboarding chat stays visible as context in the coach drawer afterwards.

**Alternatives considered**:
- `keepMounted` portal (R3): worked, but always-mounted DOM cost and reliance on
  drawer internals; reverted by the user in favor of the SDK pattern.
- Provider only in `(main)` layout with a private onboarding instance: rejected —
  loses the onboarding → app conversation continuity the user asked for.
- Provider in the root layout: works, but would also wrap `(auth)/login`, where no
  chat exists; the `(protected)` group scopes it to authenticated routes only.

## R7. (Supersedes R1's open/pendingMessage state and R2) Imperative drawer handle + direct send

**Decision**: Replace the controlled drawer + `pendingMessage` queue with:
(a) base-ui's `Drawer.createHandle()` (imperative `open`/`close` on an uncontrolled
drawer, passed via the `handle` prop — verified in `@base-ui/react@1.6.0`), and
(b) a `useCoachChat()` hook (wrapper of `useChat({ chat })` over the shared
context instance) so the help button calls `sendMessage` directly in its `onClick`
and then `drawerHandle.open(null)`.

**Rationale**:
- User-directed; removes an entire state machine (pendingMessage, send effect,
  Strict-Mode dedupe ref, controlled `open`) — the double-send bug class is
  impossible in a once-per-tap event handler.
- `sendMessage` is a method of the shared `Chat` instance, so sending with the
  panel unmounted is safe; the panel renders the in-flight stream when it mounts.
- The handle keeps the drawer's own gestures (swipe, trigger, dismiss) fully
  owned by base-ui — no controlled-state mirroring.

**Alternatives considered**:
- Keep the controlled `open` boolean only for opening: rejected — the handle API
  does the same with less state, honoring "remove controlled mode" literally.
- Call `chat.sendMessage(...)` directly off `useCoach().chat` (no `useChat`
  subscription in the button, avoiding re-renders during streaming): valid
  optimization, but the user explicitly asked for the `useCoachChat` wrapper;
  noted here in case button re-renders ever matter.
- Programmatic `triggerRef.click()`: rejected — hacky next to the first-class
  handle API.

## R4. External interface / API contract impact?

**Decision**: None. No backend route, schema, DTO, or Orval regeneration.

**Rationale**: The feature only submits a user message through the existing
`/api/ai` streaming path already used by `ChatPanel`. Therefore `contracts/` is
intentionally empty for this feature.

## R5. Touch-target compliance for the help button

**Decision**: Ensure the help control meets ≥ 44×44px (Constitution IV / FR-007).
The current button uses `size="icon-sm"`; verify its rendered hit area and bump the
size (or padding) if it is under 44px, without breaking the row layout.

**Rationale**: Constitution mandates ≥ 44px touch targets; the existing size may be
below that and must be confirmed/adjusted during implementation and validation.
