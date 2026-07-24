# Phase 1 Data Model: Configurable LLM Provider

**Feature**: 007-local-llm-provider | **Date**: 2026-07-24

This feature introduces **no database entities** (no Prisma schema or migration changes). The only "model" is a configuration model derived from environment variables and validated at startup.

## Configuration Entity: LLM Provider Selection

Resolved once at startup in `src/config/env.ts` (validation) and `src/lib/ai.ts` (resolution into a `LanguageModel`).

| Field | Source (env var) | Type | Required | Default | Notes |
|-------|------------------|------|----------|---------|-------|
| provider | `LLM_PROVIDER` | enum `google` \| `ollama` | Yes | — (set per environment: dev=`ollama`, prod=`google`) | Authoritative; independent of `NODE_ENV`. Unknown value → startup error listing supported values. |
| model | `LLM_MODEL` | string | No | provider-derived: `ollama`→`gemma3`, `google`→`gemini-2.5-flash` | Overrides the per-provider default when set. |
| ollamaBaseUrl | `OLLAMA_BASE_URL` | url string | No | `http://localhost:11434` | Only used when provider=`ollama`. Passed as `createOllama({ baseURL })` — the plain Ollama server root (no `/v1` or `/api` suffix). |
| googleApiKey | `GOOGLE_GENERATIVE_AI_API_KEY` | string | Conditional | — | Required **only** when provider=`google`. Read by `@ai-sdk/google` from env. |

### Validation Rules (Zod, startup fail-fast)

1. `LLM_PROVIDER` MUST be one of `google` \| `ollama`. Any other value → parse error naming the supported set. (FR-001, FR-008)
2. `LLM_MODEL` optional string; when empty/unset the resolver substitutes the per-provider default. (FR-002)
3. `OLLAMA_BASE_URL` optional; when unset defaults to `http://localhost:11434`; when set MUST be a valid URL. (FR-012)
4. `superRefine`: if `LLM_PROVIDER === 'google'` then `GOOGLE_GENERATIVE_AI_API_KEY` MUST be a non-empty string, else fail with a clear message. If `LLM_PROVIDER === 'ollama'`, the Gemini key is not required. (FR-008, FR-009)
5. `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` remain unconditionally required (better-auth OAuth — unrelated to LLM provider).

### Resolution Logic (`src/lib/ai.ts`)

```text
modelId = LLM_MODEL ?? defaultModelFor(LLM_PROVIDER)   # gemma3 | gemini-2.5-flash

switch (LLM_PROVIDER) {
  case 'ollama':
    ollama = createOllama({ baseURL: OLLAMA_BASE_URL })   # from ai-sdk-ollama
    languageModel = ollama(modelId)
  case 'google':
    languageModel = google(modelId)                        # from @ai-sdk/google
}
```

`languageModel` is what `ai.routes.ts` passes to `streamText({ model })`. `@ai-sdk/google` reads `GOOGLE_GENERATIVE_AI_API_KEY` from the environment automatically.

### State / Lifecycle

- Resolved once at process startup; static for the process lifetime. Changing provider/model requires an env change + restart (matches SC-002). No runtime mutation, no persistence, no per-request state.

### Relationships

- Consumed by `src/routes/ai.routes.ts` (the only consumer). Independent of all DB entities and use-cases; the Coach's tools call the same use-cases regardless of the resolved provider (FR-006).
