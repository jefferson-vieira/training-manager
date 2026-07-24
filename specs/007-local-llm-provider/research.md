# Phase 0 Research: Configurable LLM Provider

**Feature**: 007-local-llm-provider | **Date**: 2026-07-24

Docs consulted via Context7 (AI SDK `/websites/ai-sdk_dev`) and the AI SDK Ollama community-providers page + the `ai-sdk-ollama` package README (`github.com/jagreehal/ai-sdk-ollama`, npm registry metadata). Updated per user direction to use `ai-sdk-ollama` (not `@ai-sdk/openai-compatible`), keeping `@ai-sdk/google` for Gemini.

## Decision 1 — Runtime provider/model selection: small provider factory

**Decision**: Add `src/lib/ai.ts` exporting a resolved `languageModel`, selected by a `switch` on `LLM_PROVIDER`:

```text
LLM_PROVIDER === 'ollama' → ollama(LLM_MODEL ?? 'gemma3')          # ai-sdk-ollama instance
LLM_PROVIDER === 'google' → google(LLM_MODEL ?? 'gemini-2.5-flash') # @ai-sdk/google
```

**Rationale**:
- Smallest, most robust approach for two providers; the handler still receives a `LanguageModel` for `streamText({ model })`.
- Avoids assuming the `ai-sdk-ollama` community provider instance plugs into `createProviderRegistry` (registry expects provider objects exposing `.languageModel`; a direct factory sidesteps that compatibility question).
- Extensible: adding a provider later is a new `case` (satisfies the spec's "structured so more providers can be added later").

**Alternatives considered**:
- `createProviderRegistry({ google, ollama })` + `registry.languageModel('provider:model')` — idiomatic for official providers, but adds a compatibility assumption on the community provider and string-parsing indirection for no gain at two providers.
- `customProvider({ languageModels, fallbackProvider })` — aimed at per-model setting overrides/aliases; heavier than needed.

## Decision 2 — Ollama integration: `ai-sdk-ollama` community provider

**Decision**: Use `ai-sdk-ollama` — `createOllama({ baseURL: OLLAMA_BASE_URL })` (default `http://localhost:11434`) → `ollama(modelId)`. Register it in the factory from Decision 1.

**Rationale**:
- User-directed choice. `ai-sdk-ollama` is built on the **official Ollama JS client** and provides **reliable tool calling** — it explicitly synthesizes complete output where standard Ollama providers can execute a tool then return empty text. This directly de-risks the Coach's hard dependency on tool calls.
- `createOllama`'s `baseURL` option takes the **plain Ollama server root** (`http://localhost:11434`, no `/v1` or `/api` suffix), matching the spec's `OLLAMA_BASE_URL` default exactly.
- No API key for local Ollama; `baseURL` supports remote/containerized servers.

**API (verified from README)**:
```ts
import { createOllama } from 'ai-sdk-ollama';
const ollama = createOllama({ baseURL: env.OLLAMA_BASE_URL }); // e.g. http://localhost:11434
const model = ollama(env.LLM_MODEL ?? 'gemma3');
```

**Version compatibility (verified via npm registry)**:
- The project has been **upgraded to AI SDK v7**: `ai@7.0.37`, `@ai-sdk/google@4.0.23` (both latest; kept as-is).
- `ai-sdk-ollama` majors track AI SDK majors: `3.x → ai@^6`, **`4.x → ai@^7`**. `4.0.0` (latest) peer-requires `ai@^7.0.0`.
- **Decision**: install **`ai-sdk-ollama@^4.0.0`** — peer-aligned to the upgraded runtime; no `ai` pinning needed. The provider API is unchanged from 3.x (`createOllama({ baseURL }) → ollama(modelId)`); the v3→v4 major reflects the AI SDK v6→v7 alignment, not a provider API restructure.

**Alternatives considered**:
- `@ai-sdk/openai-compatible` (previous plan) — official, but looser tool-call guarantees for Ollama vs. the purpose-built provider.
- `ollama-ai-provider-v2` (nordwestt) — docs flag it as best for *simple text generation*, weaker for tools. Rejected.

## Decision 3 — Per-provider default model

**Decision**: `LLM_MODEL` is optional; when unset, the resolver picks a default by provider: `gemma3` for `ollama`, `gemini-2.5-flash` for `google`. `.env.example` ships the dev defaults explicitly.

**Rationale**: Satisfies the clarified "committed defaults, overridable" decision and preserves current production behavior (`gemini-2.5-flash`) with zero config change.

## Decision 4 — Gemma 3 tool-calling caveat (RISK)

**Finding**: Gemma 3 via Ollama has a **known limitation around native tool calling** (Ollama historically rejects `tools` for `gemma3`). The Coach relies on tool calls (`getUser`, `createWorkoutPlan`, `getWorkoutPlans`, `upsertUserProfile`).

**Decision**: Ship `gemma3` as the documented default per the product-owner clarification, but **manual verification MUST exercise a tool-driven flow** (e.g. "create a workout plan"). If `gemma3` cannot perform tool calls through Ollama, switch the documented default `LLM_MODEL` to a tool-capable model — **`llama3.1:8b`** (canonical Ollama tool-calling model) or **`qwen2.5`** (strong tools + Portuguese). This substitution is env-only, no code change.

**Rationale**: Honors the clarified choice while making the tool-calling dependency explicit and cheaply correctable. Note: `ai-sdk-ollama` improves tool-call *reliability* (synthesizing complete output) but cannot grant tool support to a model that Ollama does not expose tools for — so the `gemma3` verification step still stands. Recorded as an Assumption/Edge Case in the spec.

## Decision 5 — Request timeout: 120s abort signal

**Decision**: Pass `abortSignal: AbortSignal.timeout(120_000)` to `streamText` so an unreachable/slow local model fails within 120s instead of hanging.

**Rationale**: Matches the clarified 120s bound; tolerates first-request cold model load while bounding hangs. `streamText` surfaces the abort as a stream error the handler already returns to the client.

## Decision 6 — Conditional Gemini API key validation

**Decision**: Make `GOOGLE_GENERATIVE_AI_API_KEY` optional in the Zod schema and add a `superRefine`: if `LLM_PROVIDER === 'google'` the key MUST be present; `LLM_PROVIDER === 'ollama'` requires no Gemini key. Startup fails fast with a clear message on violation.

**Rationale**: Satisfies FR-008/FR-009 (dev needs no Gemini credentials; prod misconfig caught at startup). `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` stay required — they belong to better-auth OAuth, independent of the LLM provider.

## No-change confirmations

- **`/api/ai` contract unchanged**: request (`{ messages }`) and streamed UI-message response are identical → **no OpenAPI change, no `npx orval` regen**.
- **No Prisma/DB change**: feature is purely provider configuration.
- **No frontend change**: Coach drawer, `contexts/coach-context.tsx`, and `hooks/use-coach-chat.ts` are provider-agnostic.
