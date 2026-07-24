# Contract: Environment Configuration (LLM Provider)

**Feature**: 007-local-llm-provider | **Date**: 2026-07-24

The interface this feature exposes is the **environment-variable contract** for selecting the AI Coach's LLM provider. The HTTP contract (`POST /api/ai`) is **unchanged** — request `{ messages }` and the streamed UI-message response are identical, so no OpenAPI/Orval change is required.

## New / changed environment variables (`packages/backend`)

| Variable | Required | Allowed values | Default | Purpose |
|----------|----------|----------------|---------|---------|
| `LLM_PROVIDER` | Yes | `google` \| `ollama` | none (dev `.env` sets `ollama`, prod sets `google`) | Selects the active LLM provider. Authoritative, independent of `NODE_ENV`. |
| `LLM_MODEL` | No | any model id valid for the selected provider | provider-derived (`ollama`→`gemma3`, `google`→`gemini-2.5-flash`) | Overrides the default model. |
| `OLLAMA_BASE_URL` | No | valid URL | `http://localhost:11434` | Ollama server root, passed to `ai-sdk-ollama`'s `createOllama({ baseURL })` (no `/v1` or `/api` suffix). Only used when `LLM_PROVIDER=ollama`. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Conditional | string | none | Now required **only** when `LLM_PROVIDER=google`. Not required for `ollama`. |

Unchanged, still required regardless of provider: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (better-auth OAuth), `SYSTEM_PROMPT`, and all existing vars.

## Startup validation behavior (fail-fast)

| Condition | Result |
|-----------|--------|
| `LLM_PROVIDER` unset or not in {`google`,`ollama`} | Process fails to start; error names the supported values. |
| `LLM_PROVIDER=google` and `GOOGLE_GENERATIVE_AI_API_KEY` missing/empty | Process fails to start; error identifies the missing key. |
| `LLM_PROVIDER=ollama` and no Gemini key present | Starts normally (Gemini key not required). |
| `OLLAMA_BASE_URL` set to an invalid URL | Process fails to start; error identifies the bad URL. |

## Runtime behavior contract

| Aspect | Contract |
|--------|----------|
| Model used | factory in `lib/ai.ts`: `ollama(LLM_MODEL ?? 'gemma3')` (via `ai-sdk-ollama`) or `google(LLM_MODEL ?? 'gemini-2.5-flash')` |
| Streaming | Responses stream incrementally for every provider (unchanged `streamText` → `toUIMessageStreamResponse`). |
| Tools | The same Coach tools (`getUser`, `upsertUserProfile`, `createWorkoutPlan`, `getWorkoutPlans`) are registered for every provider and call the same use-cases. |
| Timeout | A Coach request aborts with a clear error after at most **120s** (`AbortSignal.timeout(120_000)`), rather than hanging. |
| Switching | Changing provider/model is env-only + restart; no code change, no redeploy of the client. |

## Example configurations

Development (`.env`):

```bash
LLM_PROVIDER=ollama
LLM_MODEL=gemma3
OLLAMA_BASE_URL=http://localhost:11434
# GOOGLE_GENERATIVE_AI_API_KEY not required
```

Production (`.env`):

```bash
LLM_PROVIDER=google
LLM_MODEL=gemini-2.5-flash
GOOGLE_GENERATIVE_AI_API_KEY=<key>
```
