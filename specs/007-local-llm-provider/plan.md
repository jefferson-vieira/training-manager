# Implementation Plan: Configurable LLM Provider (Local Model in Development)

**Branch**: `007-local-llm-provider` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-local-llm-provider/spec.md`

## Summary

Make the AI Coach's LLM provider and model configurable via environment variables so development runs against a local Ollama model while production keeps Google Gemini, with no code change to switch. Technical approach: add a small **provider factory** in `src/lib/ai.ts` that resolves a `LanguageModel` from a new `LLM_PROVIDER`/`LLM_MODEL` pair — `google(...)` via the existing `@ai-sdk/google` for Gemini and `ollama(...)` via the **`ai-sdk-ollama`** community provider (built on the official Ollama JS client, chosen for reliable tool calling) for local models. Configuration is validated at startup with the existing Zod env schema, and Coach requests are bounded with a 120s abort timeout. Backend-only change; the `/api/ai` HTTP contract is unchanged (no Orval regeneration).

## Technical Context

**Language/Version**: TypeScript (Node v24.14.0 per `.nvmrc`)

**Primary Dependencies**: Fastify 5, Vercel AI SDK `ai@7.0.37` (v7), `@ai-sdk/google@4.0.23` (Gemini — kept as-is); **new**: `ai-sdk-ollama@^4.0.0` (community provider on the official Ollama JS client) for the local model. `ai-sdk-ollama@4` peer-requires `ai@^7`, matching the now-upgraded runtime — no version pinning gymnastics needed (see research.md).

**Storage**: PostgreSQL via Prisma — **not touched** by this feature (no schema/migration changes)

**Testing**: **NONE** — Constitution Principle I forbids all automated tests. Manual verification only (Coach drawer + local Ollama).

**Target Platform**: Node server (`packages/backend`); no frontend change

**Project Type**: npm workspaces monorepo — change is confined to `packages/backend`

**Performance Goals**: AI route MUST keep streaming tokens incrementally (unchanged `streamText` → `toUIMessageStreamResponse`); local-model requests bounded at 120s before failing clearly

**Constraints**: Minimal new dependencies (justify Ollama provider package); no API contract change → no Orval regen; env validated fail-fast at startup. The route already uses the **AI SDK v7** API (`instructions:`, `stopWhen: isStepCount(...)`), so the feature edit only swaps `model:` and adds `abortSignal:` — no v6 idioms reintroduced, no separate v7 migration in scope (already done by the user).

**Scale/Scope**: One route (`src/routes/ai.routes.ts`), one new infra module (`src/lib/ai.ts`), env schema + `.env.example`, quickstart docs. Two providers (google, ollama), extensible via the registry.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **No Automated Testing**: Plan includes zero test tasks, test infra, or test frameworks — verification is manual (see quickstart.md)
- [x] **Code Quality**: Provider/model resolution lives in infra module `src/lib/ai.ts`; route handler stays thin (just consumes the resolved model). No business logic added to the handler
- [x] **UX Consistency**: No UI change; Coach drawer behavior is provider-agnostic
- [x] **Responsive Design**: N/A — no frontend change
- [x] **Minimal Dependencies**: One new package (`ai-sdk-ollama@^4.0.0`) — justified in Complexity Tracking (purpose-built Ollama provider with reliable tool calling, on the official Ollama JS client; peer-aligned to the project's `ai@7`)
- [x] **Performance**: Streaming preserved verbatim; no N+1 (no DB access added); 120s abort bounds hangs
- [x] **Package Rules**: Backend-only; env var contract documented; **no OpenAPI/`/api/ai` shape change → no Orval regeneration required**

**Result**: PASS (see Complexity Tracking for the single dependency justification). Re-checked post-design: PASS — no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/007-local-llm-provider/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (configuration model)
├── quickstart.md        # Phase 1 output (manual validation guide)
├── contracts/
│   └── env-config.md    # Phase 1 output (environment variable contract)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/backend/src/
├── config/
│   └── env.ts            # ADD LLM_PROVIDER, LLM_MODEL, OLLAMA_BASE_URL; make GOOGLE_GENERATIVE_AI_API_KEY conditionally required
├── lib/
│   ├── ai.ts             # NEW — provider factory (google + ollama via ai-sdk-ollama), model resolution + per-provider default, exported languageModel getter
│   ├── auth.ts
│   ├── db.ts
│   └── fastify.ts
└── routes/
    └── ai.routes.ts      # USE resolved model from lib/ai.ts; add 120s abortSignal to streamText

packages/backend/.env.example   # ADD new LLM_* / OLLAMA_* vars with dev defaults + comments
```

**Structure Decision**: Backend-only. Provider selection is infrastructure, so it lives in `src/lib/ai.ts` (per constitution: `lib/` holds infrastructure) as a small factory (`switch` on `LLM_PROVIDER`) rather than a registry — the smallest, most robust approach for two providers and avoids assuming the community provider is `createProviderRegistry`-compatible. Adding a provider later is a new `case`. The route handler consumes the resolved model and remains a thin HTTP boundary. No web package changes; no Prisma changes.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New npm dependency `ai-sdk-ollama@^4.0.0` (backend) | AI SDK has no built-in Ollama provider; the Coach requires reliable **tool calling** against a local model. `ai-sdk-ollama` is built on the official Ollama JS client and explicitly synthesizes complete tool-call output where standard providers return empty text — directly de-risking the Coach's tool dependency (per user direction). | `@ai-sdk/openai-compatible` (earlier plan) works but has weaker/looser tool-call guarantees for Ollama; `ollama-ai-provider-v2` is documented as best only for simple text generation. Hand-rolling a client duplicates maintained SDK code. v4 peer-requires `ai@^7`, matching the upgraded runtime. |
