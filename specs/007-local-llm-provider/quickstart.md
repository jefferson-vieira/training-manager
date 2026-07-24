# Quickstart & Manual Validation: Configurable LLM Provider

**Feature**: 007-local-llm-provider | **Date**: 2026-07-24

Constitution forbids automated tests — this is the manual validation guide. See [contracts/env-config.md](./contracts/env-config.md) for the full variable contract and [data-model.md](./data-model.md) for resolution details.

## Prerequisites

- Backend deps installed (`npm install` at repo root), including the new `ai-sdk-ollama@^4.0.0` (peer-aligned to the project's `ai@7.0.37`; installed in `packages/backend`).
- Postgres running (`docker compose up -d`) and migrations applied.
- [Ollama](https://ollama.com) installed and running locally for the dev-provider scenarios:

```bash
ollama serve                 # if not already running (default http://localhost:11434)
ollama pull gemma3           # the committed dev default
ollama pull llama3.1:8b      # tool-capable fallback (see Scenario 2 caveat)
```

## Scenario 1 — Dev uses local Ollama, streams a reply (User Story 1, P1)

1. In `packages/backend/.env` set:
   ```bash
   LLM_PROVIDER=ollama
   LLM_MODEL=gemma3
   OLLAMA_BASE_URL=http://localhost:11434
   ```
   Remove/leave empty `GOOGLE_GENERATIVE_AI_API_KEY`.
2. Start backend `npm run dev` (port 3333) and web `npm run dev` (port 3000).
3. Open the app, open the **Coach IA** drawer, send a plain message (e.g. "Oi").
4. **Expected**: reply streams into the drawer; the Ollama server receives the request (visible in `ollama serve` logs); no request goes to Google. Backend started without a Gemini key.

## Scenario 2 — Tool-driven flow works locally (User Story 1 AC#2 + gemma3 caveat)

1. Same config as Scenario 1.
2. In the Coach, go through profile capture and ask to **create a workout plan** (exercises the `createWorkoutPlan` tool).
3. **Expected**: the plan is created and the home link is returned.
4. **⚠️ Caveat**: Gemma 3 via Ollama has a known tool-calling limitation. If tool calls fail (e.g. an Ollama error that the model "does not support tools", or the Coach never invokes tools), switch to a tool-capable model with **env only**:
   ```bash
   LLM_MODEL=llama3.1:8b   # or qwen2.5
   ```
   Restart the backend and repeat — the tool flow should now succeed. Update `.env.example`'s documented default accordingly if the substitution is adopted.

## Scenario 3 — Production keeps Gemini, unchanged (User Story 2, P1)

1. Set:
   ```bash
   LLM_PROVIDER=google
   LLM_MODEL=gemini-2.5-flash
   GOOGLE_GENERATIVE_AI_API_KEY=<valid key>
   ```
2. Restart backend; exercise the Coach (chat + create plan).
3. **Expected**: behavior/streaming identical to before this feature; requests served by Gemini.

## Scenario 4 — Env-only switching (User Story 3, P2)

1. Toggle `LLM_PROVIDER` between `ollama` and `google` (with the matching model/key) and restart.
2. **Expected**: active provider changes with no source edit.

## Scenario 5 — Fail-fast on misconfiguration (FR-008)

| Set this | Expected on `npm run dev` |
|----------|---------------------------|
| `LLM_PROVIDER=openai` (unsupported) | Startup fails; error lists supported values `google`,`ollama`. |
| `LLM_PROVIDER=google` with empty `GOOGLE_GENERATIVE_AI_API_KEY` | Startup fails; error names the missing key. |
| `OLLAMA_BASE_URL=not-a-url` | Startup fails; error names the invalid URL. |

## Scenario 6 — Local model unreachable is bounded (FR-010, 120s)

1. Set `LLM_PROVIDER=ollama` and stop the Ollama server (`ollama serve` not running), or point `OLLAMA_BASE_URL` at a dead port.
2. Send a Coach message.
3. **Expected**: the request fails with a clear error within ~120s; the backend process stays up and continues serving other requests.

## Sign-off checklist

- [ ] Dev Coach replies via Ollama with no Gemini key (Scenario 1)
- [ ] A tool-driven Coach action works locally (Scenario 2; note which model)
- [ ] Production config serves via Gemini unchanged (Scenario 3)
- [ ] Provider switch is env-only (Scenario 4)
- [ ] All three misconfig cases fail fast at startup (Scenario 5)
- [ ] Unreachable Ollama fails within ~120s without crashing (Scenario 6)
