---

description: "Task list for feature: Configurable LLM Provider (Local Model in Development)"
---

# Tasks: Configurable LLM Provider (Local Model in Development)

**Input**: Design documents from `/specs/007-local-llm-provider/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/env-config.md, quickstart.md

**Tests**: **FORBIDDEN** — Constitution Principle I prohibits all automated tests. Verification is manual only (quickstart.md).

**Organization**: Tasks are grouped by user story. The shared code is infrastructure serving all three stories, so it lives in the Foundational phase; each user story is then a configuration + manual-verification increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `packages/backend/src/` — this feature touches `config/env.ts`, `lib/ai.ts` (new), `routes/ai.routes.ts`, and `.env.example`
- **No frontend, no Prisma, no Orval regen**: the `/api/ai` HTTP contract is unchanged (see contracts/env-config.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the one new dependency.

- [X] T001 Install the Ollama provider in the backend workspace: `cd packages/backend && npm install ai-sdk-ollama@^4.0.0`. Confirm its peer `ai@^7` resolves cleanly against the installed `ai@7.0.37` (no peer warnings) and that it is added to `packages/backend/package.json` (not the repo root).

**Checkpoint**: Dependency available.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared provider-selection code. **All user stories depend on this phase.**

**⚠️ CRITICAL**: No user story verification can pass until this phase is complete.

- [X] T002 Extend the env schema in `packages/backend/src/config/env.ts` per data-model.md: add `LLM_PROVIDER` (`z.enum(['google','ollama'])`), `LLM_MODEL` (optional string), `OLLAMA_BASE_URL` (optional URL, default `http://localhost:11434`); change `GOOGLE_GENERATIVE_AI_API_KEY` to optional; add a `superRefine` that requires a non-empty `GOOGLE_GENERATIVE_AI_API_KEY` **only** when `LLM_PROVIDER === 'google'`, with a clear error message. Keep `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` unconditionally required.
- [X] T003 Create the provider factory `packages/backend/src/lib/ai.ts` (new, infrastructure) per data-model.md resolution logic: import `google` from `@ai-sdk/google` and `createOllama` from `ai-sdk-ollama`; compute the model id as `env.LLM_MODEL ?? defaultFor(env.LLM_PROVIDER)` (`ollama`→`gemma3`, `google`→`gemini-2.5-flash`); `switch (env.LLM_PROVIDER)` returning `createOllama({ baseURL: env.OLLAMA_BASE_URL })(modelId)` or `google(modelId)`; export the resolved `languageModel`. Use the early-return/guard style. (depends on T001, T002)
- [X] T004 Wire `packages/backend/src/routes/ai.routes.ts` to the factory: replace `model: google('gemini-2.5-flash')` with the `languageModel` imported from `../lib/ai.js`, add `abortSignal: AbortSignal.timeout(120_000)` to the `streamText({ ... })` call (FR-010, 120s bound), and remove the now-unused `google` import. Leave the existing v7 API (`instructions:`, `stopWhen: isStepCount(10)`), tools, and `toUIMessageStreamResponse()` untouched. (depends on T003)
- [X] T005 [P] Update `packages/backend/.env.example`: add `LLM_PROVIDER=ollama`, `LLM_MODEL=gemma3`, `OLLAMA_BASE_URL=http://localhost:11434` with a short comment block, and note that `GOOGLE_GENERATIVE_AI_API_KEY` is required only when `LLM_PROVIDER=google`. (independent file)

**Checkpoint**: `npm run dev` starts with the new config; provider/model resolve from env. User story verification can begin.

---

## Phase 3: User Story 1 - Run the AI Coach against a local model in development (Priority: P1) 🎯 MVP

**Goal**: In development, the Coach talks to a local Ollama model — streaming replies and executing its tools — with no Gemini cost, no Gemini key, and no external dependency.

**Independent Verification**: With Ollama running and dev `.env` set to the local provider, the Coach drawer returns a streamed reply and can complete a tool-driven action, while the backend runs without any Gemini credentials.

### Implementation for User Story 1

- [ ] T006 [US1] Set `packages/backend/.env` for local dev: `LLM_PROVIDER=ollama`, `LLM_MODEL=gemma3`, `OLLAMA_BASE_URL=http://localhost:11434`, and leave `GOOGLE_GENERATIVE_AI_API_KEY` empty.
- [ ] T007 [P] [US1] Ensure the local model server is ready: `ollama serve` (default `http://localhost:11434`), `ollama pull gemma3`, and `ollama pull llama3.1:8b` as a tool-capable fallback (see quickstart.md prerequisites).
- [ ] T008 [US1] Verify quickstart.md **Scenario 1**: start backend (`npm run dev`) + web, open the Coach IA drawer, send a message; confirm the reply streams in, the Ollama `serve` logs show the request, no request hits Google, and the backend started with no Gemini key. (depends on T006, T007)
- [ ] T009 [US1] Verify quickstart.md **Scenario 2** (tool flow + gemma3 caveat): via the Coach, complete profile capture and ask to create a workout plan (exercises the `createWorkoutPlan`/`getUser`/`upsertUserProfile` tools). If `gemma3` cannot perform tool calls through Ollama, set `LLM_MODEL=llama3.1:8b` (or `qwen2.5`), restart, and re-verify — then update the documented default in `packages/backend/.env.example` if the substitution is adopted. (depends on T008)
- [ ] T010 [US1] Verify quickstart.md **Scenario 6** (timeout, FR-010): stop Ollama (or point `OLLAMA_BASE_URL` at a dead port) and send a Coach message; confirm the request fails with a clear error within ~120s and the backend process stays up serving other requests. (depends on T006)

**Checkpoint**: Local Ollama Coach fully functional in dev — MVP complete.

---

## Phase 4: User Story 2 - Keep Google Gemini in production unchanged (Priority: P1)

**Goal**: With production-style configuration, the Coach behaves exactly as before this feature — served by Google Gemini.

**Independent Verification**: With `LLM_PROVIDER=google` and a valid key, Coach chat and plan creation stream via Gemini with no behavioral change.

### Implementation for User Story 2

- [ ] T011 [US2] Set `packages/backend/.env` production-style: `LLM_PROVIDER=google`, `LLM_MODEL=gemini-2.5-flash`, `GOOGLE_GENERATIVE_AI_API_KEY=<valid key>`.
- [ ] T012 [US2] Verify quickstart.md **Scenario 3**: restart the backend and exercise the Coach (chat + create plan); confirm responses are served by Gemini and streaming/behavior match pre-feature behavior. (depends on T011)

**Checkpoint**: Production path confirmed unchanged.

---

## Phase 5: User Story 3 - Select provider and model through environment variables (Priority: P2)

**Goal**: Switching provider/model is env-only, and misconfiguration is caught fast at startup.

**Independent Verification**: Toggling env vars changes the active provider without code edits; each misconfiguration fails startup with a clear, specific message.

### Implementation for User Story 3

- [ ] T013 [US3] Verify quickstart.md **Scenario 4** (env-only switching): toggle `LLM_PROVIDER` between `ollama` and `google` (with matching `LLM_MODEL`/key), restart, and confirm the active provider changes with no source edit.
- [ ] T014 [US3] Verify quickstart.md **Scenario 5** (fail-fast, FR-008) — all three cases produce a clear startup failure on `npm run dev`: (a) `LLM_PROVIDER=openai` → error lists supported values `google`,`ollama`; (b) `LLM_PROVIDER=google` with empty `GOOGLE_GENERATIVE_AI_API_KEY` → error names the missing key; (c) `OLLAMA_BASE_URL=not-a-url` → error names the invalid URL.

**Checkpoint**: All three stories independently verifiable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Docs and final validation (FR-011).

- [X] T015 [P] Update developer docs for the new provider config: adjust the AI Coach description in `CLAUDE.md` (provider/model now env-configurable; dev=Ollama, prod=Gemini) and `docs/CODEBASE.md` where it documents the AI provider, referencing the variables in contracts/env-config.md.
- [X] T016 Run backend quality gates: `cd packages/backend && npm run lint && npm run build`; fix any issues introduced by T002–T004.
- [ ] T017 Complete the quickstart.md **Sign-off checklist** end-to-end (all six scenarios) and record which Ollama model was used for the tool flow (gemma3 or the substituted fallback).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on T001 — **blocks all user stories**. Order within: T002 → T003 → T004 (each imports the previous); T005 is `[P]` (independent file).
- **User Stories (Phase 3–5)**: all depend on Foundational completion. They differ only in `.env` config + which manual scenarios they verify, so run them sequentially by priority (P1 → P1 → P2) or in parallel across environments.
- **Polish (Phase 6)**: after the stories you intend to ship are verified.

### User Story Dependencies

- **US1 (P1)**: after Foundational. No dependency on other stories.
- **US2 (P1)**: after Foundational. Independent of US1 (just a different `.env`).
- **US3 (P2)**: after Foundational. Independent; exercises switching + validation.

### Within Each User Story

- Set `.env` (and, for US1, ensure Ollama is running/pulled) before running the verification scenario.
- T008 → T009 (tool flow builds on a working chat); T010 is independent of T008/T009 (only needs T006).

### Parallel Opportunities

- T005 `[P]` runs alongside T002–T004 (different file).
- T007 `[P]` (ollama pull/serve) runs alongside the `.env` edit (T006).
- T015 `[P]` (docs) runs alongside T016/T017 setup.
- Because the code is shared, the user stories cannot parallelize *code* work — only the *verification* passes can run in parallel across separate environments/branches.

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1).
2. **STOP and VALIDATE**: run quickstart Scenarios 1, 2, 6. If gemma3 lacks tool calls, switch `LLM_MODEL` per T009.
3. This delivers the core value: local, cost-free Coach development.

### Incremental Delivery

1. Setup + Foundational → shared code ready.
2. US1 → verify → MVP (local dev).
3. US2 → verify → production parity confirmed.
4. US3 → verify → switching + fail-fast confirmed.
5. Polish → docs + lint/build + full sign-off.

---

## Notes

- **No automated tests** (Constitution Principle I) — every verification task is manual via quickstart.md.
- **No Orval regeneration**: the `/api/ai` request/response shape is unchanged; do not run `npx orval`.
- **Do not edit** `packages/backend/src/generated/`.
- Business logic (provider resolution) stays in `lib/ai.ts`; the route handler remains a thin HTTP boundary (constitution).
- Commit after each logical group (e.g., T002–T004 as the core wiring, then per-story config).
- The v7 migration is already done by the user — do not reintroduce v6 idioms (`system:`, `stepCountIs`) in T004.
