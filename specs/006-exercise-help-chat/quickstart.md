# Quickstart & Manual Validation: Exercise Help via Coach AI

> Constitution Principle I forbids automated tests. Validation is manual, via the
> running app and chrome-devtools MCP.

## Prerequisites

- Backend running: `cd packages/backend && docker compose up -d && npm run dev` (port 3333)
- Web running: `cd packages/web && npm run dev` (port 3000)
- Logged-in user with an **active workout plan** that has at least one non-rest day
  containing multiple exercises (needed for the "correct exercise name" checks).

## How to reach the screen

1. Open `http://localhost:3000` and sign in.
2. Navigate to a workout day with exercises:
   `/workout-plans/<planId>/days/<dayId>` (reachable from the plan/home flow).

## Validation scenarios (map to spec)

### V1 — Opens drawer and asks about the tapped exercise (US1 / FR-001..FR-004)
1. Note the name of the first exercise (e.g. "Supino reto").
2. Tap that exercise's help control (the `?` icon in the row).
3. Expect: the Coach AI drawer opens and a **user** message reading
   `Como executar o exercício Supino reto corretamente?` appears in the conversation.

### V2 — Coach responds via the normal stream (FR-005 / Acceptance #2)
1. After V1, wait for the assistant response.
2. Expect: the answer streams in exactly like a typed message (same "Processando…"
   indicator, same streamed text, same failure UI if the request errors).

### V3 — Correct exercise per row (FR-006 / SC-002 / Acceptance #3)
1. Close the drawer. Tap the help control on a **different** exercise row.
2. Expect: the new question names **that** exercise, never another row's name.

### V4 — Conversation is preserved across close/open (FR-009 / Acceptance #4)
1. With messages already in the thread from V1–V3, close the drawer and reopen it
   (via the Coach AI button or another exercise help control).
2. Expect: prior messages are still present; the new help question is **appended**
   to the same thread (not a reset/empty conversation).
   - Persistence comes from the shared `Chat` instance in `CoachProvider`
     (research.md R6); `ChatPanel` unmounting on close is expected and harmless.

### V7 — Conversation carries from onboarding into the app (research.md R6)
1. Log in as a user that lands on `/onboarding` (no active plan) and exchange a few
   messages with the onboarding chat (e.g. create a plan).
2. Navigate into the app (soft navigation — the post-onboarding redirect/link, not
   a full page reload) and open the Coach AI drawer.
3. Expect: the onboarding messages are present in the drawer conversation — one
   continuous thread across onboarding and the rest of the app.
4. Also confirm route URLs are unchanged by the `(protected)` group (`/`,
   `/onboarding`, `/workout-plan`, `/stats`, `/profile`, `/workout-plans/…`) and
   `/login` still redirects logged-out users.

### V5 — Ask while a response is streaming (Edge case)
1. Trigger a help request, then close the drawer while the answer is still
   streaming; tap another exercise's help button.
2. Expect: no crash/duplicate — while busy, the tap only reopens the drawer
   (showing the in-flight stream); the new question is not sent (busy guard in
   `ExerciseHelpButton`, mirroring the input's behavior).

### V6 — Special characters / long names (Edge cases)
1. Use (or temporarily seed) an exercise whose name has accents/long text.
2. Expect: the sent question contains the full name verbatim, untruncated.

## Responsive & quality checks (chrome-devtools MCP — Constitution IV)

- Emulate 320px and 1280px widths; the help control is fully visible, not clipped,
  no horizontal scroll on the row.
- Confirm the help control's touch target is **≥ 44×44px** (FR-007). If under, bump
  the button size/padding and re-verify.
- Check the console for errors and the network panel for failed requests during the
  flow.

## Done criteria

- V1–V6 pass; SC-001 (open + question visible < 2s) observed; SC-004 (usable at
  320px and 1280px) confirmed; no console errors introduced.
