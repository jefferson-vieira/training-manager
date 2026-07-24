# Feature Specification: Configurable LLM Provider (Local Model in Development)

**Feature Branch**: `007-local-llm-provider`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "usar LLM modelo local durante desenvolvimento - adaptar o projeto para suportar outros modelos como provedor de LLM no ambiente de desenvolvimento. A seleção do provedor e do modelo devem ocorrer através de variáveis de ambiente. Para o ambiente de desenvolvimento deve utilizar o Ollama. Para produção deve continuar utilizando o google gemini."

## Clarifications

### Session 2026-07-24

- Q: How should the active LLM provider be selected at runtime? → A: An explicit `LLM_PROVIDER` environment variable (e.g. `ollama` | `google`) is authoritative and independent of `NODE_ENV`; each environment's configuration sets it (dev = Ollama, prod = Google).
- Q: How should the local (Ollama) server connection be configured? → A: The Ollama base URL is set via an environment variable with a sensible default (`http://localhost:11434`), so remote/containerized Ollama is supported when needed.
- Q: How broad should provider support be in this feature? → A: Support exactly two providers now — Ollama (dev) and Google Gemini (prod) — via a small selection switch structured so more providers can be added later.
- Q: Should model names have committed defaults or be required? → A: Ship sensible default model names per provider (a default Ollama model for dev, `gemini-2.5-flash` for prod) in the example config, overridable via environment variable.
- Q: Which model should be the committed default for the local (Ollama) provider in development? → A: `gemma3`. Caveat: the Coach relies on tool/action calls and Gemma 3 via Ollama has a known limitation around native tool calling; if `gemma3` cannot perform tool calls through Ollama, a tool-capable model (e.g. `llama3.1:8b` or `qwen2.5`) MUST be substituted as the documented default.
- Q: When the local model is slow or unreachable, after how long should a Coach request fail with a clear error? → A: 120 seconds (generous enough to tolerate first-request cold model load while still bounding hangs).

## User Scenarios *(mandatory)*

### User Story 1 - Run the AI Coach against a local model in development (Priority: P1)

As a developer working on the AI Coach locally, I want the application to talk to a locally hosted model (Ollama) instead of the paid Google Gemini service, so I can develop and manually verify Coach behavior without consuming cloud quota, incurring cost, or depending on external connectivity.

**Why this priority**: This is the core motivation. Today every local Coach interaction hits Gemini, which costs money, requires a valid cloud API key for anyone running the project, and depends on internet access. Switching development to a local model removes all three frictions and is the minimum viable outcome of this feature.

**Independent Verification**: With the development environment configured for the local provider and a local model server running, open the Coach IA drawer, send a message, and confirm the response streams back from the local model (verifiable by the local model server receiving the request and the app returning a coherent reply) with no request made to Google Gemini.

**Acceptance Scenarios**:

1. **Given** the development environment is configured to use the local provider and model, and the local model server is running, **When** a developer sends a message in the Coach IA drawer, **Then** the response is produced by the local model and streamed back into the drawer.
2. **Given** the development environment is configured for the local provider, **When** the Coach triggers one of its actions (e.g. creating or reading a workout plan), **Then** the action executes against the same use-cases used in production and the result is reflected in the reply.
3. **Given** no Google Gemini credentials are present in the development environment, **When** the developer starts the backend and uses the Coach, **Then** the app works using the local model without requiring Gemini credentials.

---

### User Story 2 - Keep Google Gemini in production unchanged (Priority: P1)

As the product owner, I want production to continue using Google Gemini exactly as it does today, so that switching development to a local model introduces no behavioral or quality regression for real users.

**Why this priority**: The change must be additive. Production quality and reliability depend on Gemini; any risk of accidentally shipping the local development model to production would degrade the live experience and is unacceptable.

**Independent Verification**: With the environment configured as production is, exercise the Coach and confirm requests are served by Google Gemini and the behavior matches current production behavior.

**Acceptance Scenarios**:

1. **Given** the environment is configured the way production is configured, **When** a user interacts with the Coach, **Then** the response is produced by Google Gemini with the same model and system prompt behavior as before this feature.
2. **Given** a deployment to production, **When** the backend starts, **Then** it uses the Google Gemini provider and refuses to start silently mis-configured (missing required Gemini configuration is surfaced as a clear startup failure).

---

### User Story 3 - Select provider and model through environment variables (Priority: P2)

As a developer, I want to choose which LLM provider and which model are used purely through environment variables, so I can switch between the local model and Gemini (or point at a different local model) without changing code.

**Why this priority**: Environment-driven selection is the mechanism that makes stories 1 and 2 coexist and keeps configuration out of source. It is essential to the design but sits below the two outcome-level stories in priority because it is the enabler rather than the end goal.

**Independent Verification**: Change only the environment variables that select the provider and model, restart the backend, and confirm the active provider/model changes accordingly without any code edit.

**Acceptance Scenarios**:

1. **Given** environment variables specifying the local provider and a local model name, **When** the backend starts, **Then** the Coach uses that provider and model.
2. **Given** environment variables specifying the Google provider and a Gemini model name, **When** the backend starts, **Then** the Coach uses Gemini with that model.
3. **Given** an environment variable that names an unsupported provider or omits a required value for the selected provider, **When** the backend starts, **Then** startup fails with a clear message identifying the misconfiguration.

---

### Edge Cases

- **Local model server unreachable**: When the local provider is selected but the local model server is not running or not reachable, a Coach request MUST fail with a clear, developer-facing error within 120 seconds rather than hanging indefinitely or crashing the backend.
- **Missing required configuration for the selected provider**: If the selected provider is missing a value it needs (e.g. Gemini without its API key, or the local provider without a model name), the backend MUST surface the problem at startup, consistent with how the project already validates environment configuration.
- **Unknown provider value**: If the provider variable holds a value that is not a supported provider, the backend MUST reject it at startup with a message listing the supported providers.
- **Tool/action support of the chosen local model**: The Coach depends on model-driven actions (tool calls). If a selected local model cannot perform tool calls, action-dependent flows will not work; this is a constraint on which local models are appropriate, not a bug in the feature.
- **System prompt parity**: The same system prompt drives behavior regardless of provider, so behavioral differences between providers stem from model capability, not from separate prompts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST select the LLM provider used by the AI Coach from an explicit `LLM_PROVIDER` environment variable that is authoritative and independent of `NODE_ENV`. The supported values are exactly `ollama` (local) and `google` (Google Gemini) for this feature; the selection mechanism MUST be structured so additional providers can be added later without reworking it.
- **FR-002**: The system MUST allow the specific model name to be selected via environment configuration, independently of the provider, and MUST provide sensible committed default model names per provider (`gemma3` for the development Ollama provider and `gemini-2.5-flash` for the production Google provider) that can be overridden by environment variable. Because the Coach requires tool/action calling and Gemma 3 via Ollama has a known tool-calling limitation, the development default MUST be verified to perform the Coach's tool calls; if `gemma3` cannot, a tool-capable model (e.g. `llama3.1:8b` or `qwen2.5`) MUST be documented as the default instead.
- **FR-003**: The development environment configuration MUST set `LLM_PROVIDER=ollama` so development uses a locally hosted model by default.
- **FR-004**: The production environment configuration MUST set `LLM_PROVIDER=google` so production continues to use Google Gemini, preserving current Coach behavior, streaming, and system-prompt usage.
- **FR-012**: The system MUST allow the Ollama server base URL to be configured via environment variable, defaulting to `http://localhost:11434` when unset, so remote or containerized Ollama servers are supported.
- **FR-005**: The system MUST route Coach requests to the selected provider and model without any code change — only environment configuration changes.
- **FR-006**: The Coach's model-driven actions (creating/reading workout plans and any other existing tools) MUST continue to execute against the same backend use-cases regardless of the selected provider.
- **FR-007**: The system MUST continue to stream Coach responses incrementally for every supported provider, consistent with existing behavior.
- **FR-008**: The system MUST validate provider/model configuration at startup and fail fast with a clear, actionable message when the selected provider is unsupported or required values for it are missing.
- **FR-009**: The system MUST NOT require Google Gemini credentials to be present when the local provider is selected, and MUST NOT require local-provider configuration when Gemini is selected.
- **FR-010**: When the selected provider is unreachable, slow, or returns an error, the system MUST surface a clear error for that Coach request without crashing the backend process, failing the request after at most 120 seconds rather than hanging indefinitely.
- **FR-011**: The example environment configuration and developer setup documentation MUST describe the new provider/model variables and how to run the local model for development.

### Key Entities *(include if feature involves data)*

- **LLM Provider Selection**: The configured choice of which LLM backend serves Coach requests. Attributes: provider identifier (`LLM_PROVIDER` = `ollama` or `google`), the model name (per-provider default, overridable), and provider-specific connection settings (Ollama base URL with default `http://localhost:11434`; Gemini API key). Sourced from environment configuration; validated at startup.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can run the AI Coach end-to-end in development against a local model with zero Google Gemini cost and no Gemini credentials configured.
- **SC-002**: Switching the active provider/model requires only environment-variable changes and a restart — no source code edits.
- **SC-003**: Production continues to serve Coach requests via Google Gemini with no observable change in behavior compared to before this feature.
- **SC-004**: A misconfiguration (unsupported provider or missing required value) is detected at backend startup with a message that names the problem, in 100% of such cases, rather than failing later at request time.
- **SC-005**: When the local model server is running, a new developer can go from a fresh checkout to a working local Coach reply by following the setup documentation, without editing code.

## Assumptions

- The two providers in scope are the local provider **Ollama** (development default) and **Google Gemini** (production default). "Support other models" is satisfied by an environment-driven selection mechanism seeded with these two; adding further providers later reuses the same mechanism.
- Provider and model selection is driven by environment variables and can be set per environment; the intended defaults are Ollama in development and Gemini in production, but the mechanism does not hard-code the provider to the environment name — the environment variables are authoritative.
- The developer running the local model is responsible for installing and running the local model server (Ollama) and pulling a model; provisioning the local server is outside the application's scope.
- The committed development default is `gemma3`, chosen by the product owner. Because the Coach relies on tool/action-calling and Gemma 3 via Ollama has a known tool-calling limitation, the plan/implementation phase MUST verify `gemma3` performs the Coach's tool calls; if it cannot, a tool-capable model (e.g. `llama3.1:8b` or `qwen2.5`) is documented as the default instead. Selecting a model without tool-calling capability is a configuration choice with known limitations, not a defect.
- The existing environment-validation approach (fail-fast schema validation at startup) is reused for the new variables.
- The same system prompt is used across providers; no provider-specific prompt variants are introduced by this feature.
- No changes to the frontend Coach experience are required beyond what already exists; this feature is scoped to how the backend selects and calls the LLM.
