<!--
Sync Impact Report
==================
Version change: 1.1.0 → 1.2.0 (2026-07-22)
Added: packages/web structure rules — React contexts in `src/contexts/`
(one file per context with provider + trivial accessor), logic hooks in
`src/hooks/` (`use-<name>.ts`). Templates unaffected.

Previous change: 1.0.0 → 1.1.0
Modified principles: N/A
Added sections:
  - Core Principles (6): No Automated Testing, Code Quality & Clean Code,
    User Experience Consistency, Responsive Design, Minimal Dependencies,
    Performance Requirements
  - Monorepo Package Rules (backend + web)
  - Development Workflow
  - Governance
Removed sections: Template placeholder sections
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ updated
  - .specify/templates/spec-template.md ✅ updated
  - .specify/templates/tasks-template.md ✅ updated
  - .specify/templates/checklist-template.md ✅ (no changes required)
  - .specify/templates/commands/*.md ⚠ not present in repo
Follow-up TODOs: none
-->

# Fit.ai (training-manager) Constitution

## Core Principles

### I. No Automated Testing (SUPREME — NON-NEGOTIABLE)

This principle **supersedes all other project guidance**, including templates,
skills, agent instructions, and prior conventions.

- Automated tests MUST NOT be written, requested, planned, or added — no unit,
  integration, contract, e2e, snapshot, or performance test suites.
- Feature specs, plans, and task lists MUST NOT include test tasks or test
  infrastructure work unless the constitution is formally amended to re-enable
  testing.
- Verification MUST rely on manual exercise of user flows, API docs
  (`/docs`), and local dev inspection only.
- "Independent test" in specs means **independently demonstrable via manual
  verification**, not automated test coverage.

**Rationale**: The project prioritizes delivery velocity and manual validation
while the product surface is still evolving. Testing discipline will be
reintroduced via a future constitutional amendment when explicitly requested.

### II. Code Quality & Clean Code

- All new code MUST be TypeScript with explicit types at module boundaries.
- Functions and components MUST have a single, clear responsibility; prefer
  composition over inheritance and deep nesting.
- Naming MUST be descriptive and consistent with surrounding code; avoid
  abbreviations unless established in the codebase.
- Dead code, commented-out blocks, and unused imports MUST be removed before
  merge.
- Business logic MUST NOT live in route handlers or React components — delegate
  to use-cases (backend) or dedicated hooks/utilities (frontend).
- Generated files (`packages/backend/src/generated/`,
  `packages/web/src/lib/api/fetch-generated/`) MUST NOT be edited manually.

**Rationale**: Readable, layered code reduces defects and keeps the monorepo
maintainable as features grow.

### III. User Experience Consistency

- UI MUST reuse shadcn/ui components from `packages/web/src/components/ui/`
  before creating bespoke controls.
- Visual language MUST use Tailwind CSS 4 utilities and existing design tokens;
  hardcoded colors, spacing, and font sizes are forbidden unless no token exists
  (then add a token).
- Interaction patterns (buttons, forms, loading, errors, empty states) MUST match
  established pages — especially home, login, and onboarding flows.
- The global Coach IA overlay (`packages/web/src/components/chat.tsx`) MUST
  behave consistently across all routes.
- Copy, iconography, and feedback tone MUST stay coherent with the Fit.ai brand.

**Rationale**: Consistency builds user trust and reduces one-off UI debt.

### IV. Responsive Design

- Every page and overlay MUST be usable on mobile (320px+) and desktop (1280px+)
  without horizontal scroll or clipped content.
- Layouts MUST be mobile-first: base styles for small screens, progressive
  enhancement via Tailwind breakpoints (`sm`, `md`, `lg`, `xl`).
- Touch targets MUST be at least 44×44px on interactive elements.
- Images and media MUST use responsive sizing; avoid fixed pixel widths for
  primary layout containers.
- New UI MUST be manually verified at mobile and desktop widths before merge.

**Rationale**: Fit.ai is a daily-use fitness app; users train on phones.

### V. Minimal Dependencies

- New npm packages MUST be justified in the PR or plan: what problem they solve,
  why existing stack cannot, and bundle/maintenance cost.
- Prefer platform APIs, existing monorepo dependencies, and framework builtins
  over adding libraries.
- Duplicate capability libraries (e.g., two date libraries, two HTTP clients)
  MUST NOT coexist — extend or replace, do not accumulate.
- Dependencies MUST be added to the correct workspace package (`packages/backend`
  or `packages/web`), not the root, unless shared tooling requires it.
- Avoid dependencies with heavy transitive trees or unmaintained status.

**Rationale**: Fewer dependencies mean faster installs, smaller bundles, and
less security surface.

### VI. Performance Requirements

**Backend (`packages/backend`)**

- Standard CRUD and home-data endpoints MUST respond in **< 200ms p95** under
  normal local/dev load (excluding cold-start and external AI latency).
- Database access MUST use indexed queries; N+1 patterns MUST be avoided.
- AI streaming routes (`/api/ai`) MUST stream tokens incrementally — no
  buffering full responses before send.
- Payloads MUST stay lean: return only fields the client consumes.

**Frontend (`packages/web`)**

- Pages MUST avoid blocking the main thread on initial render; prefer React
  Server Components and streaming where Next.js allows.
- Client bundles MUST not grow without justification; lazy-load heavy or
  route-specific components.
- API calls MUST use the Orval-generated client and server-side data fetching
  (`dal.ts`) where appropriate to reduce client waterfalls.
- Images MUST use Next.js `Image` with appropriate sizing; fonts must not
  cause layout shift.

**Rationale**: Perceived speed drives retention in a fitness product.

## Monorepo Package Rules

This repository is an npm workspaces monorepo with two packages. Apply
principles above with package-specific constraints:

### `packages/backend` — API (Fastify + Prisma)

- Architecture MUST follow: `routes/` → `use-cases/` → `lib/db.ts` (Prisma).
- HTTP handlers MUST validate input with Zod schemas; responses MUST match
  OpenAPI contracts in `schemas/` and `dtos/`.
- Auth MUST go through `better-auth` (`lib/auth.ts`); protected routes MUST
  call `getSession()`.
- Database columns MUST use **snake_case** (`@map` in Prisma schema).
- After API contract changes, regenerate the web client:
  `cd packages/web && npx orval` (backend running).

### `packages/web` — Frontend (Next.js App Router)

- Pages live under `packages/web/src/app/`; route-specific UI in colocated
  `_components/` folders.
- Frontend utilities that encode **domain/business rules** MUST live in
  `packages/web/src/helpers/`; `packages/web/src/lib/` is reserved for
  infrastructure (API client, auth, data-access, fetch, generic `utils`).
- React contexts MUST live in `packages/web/src/contexts/` — one file per
  context containing `createContext`, the provider, and the trivial context
  accessor hook (e.g. `coach-context.tsx`). Contexts MUST NOT live in
  `components/`.
- Custom hooks with logic MUST live in `packages/web/src/hooks/`, one file per
  hook named `use-<name>.ts` (e.g. `use-coach-chat.ts`). A hook that merely
  exposes its own context stays with that context; anything beyond that belongs
  in `hooks/`.
- MUST use functional React components; prefer Server Components unless
  interactivity requires `"use client"`.
- API communication MUST use Orval-generated client + `customFetch`; session
  cookies handled via existing auth helpers.
- Route protection MUST use `packages/web/src/proxy.ts` patterns.
- Figma-driven UI MUST follow `.cursor/rules/figma-mcp.mdc` workflow and reuse
  existing components.

### Cross-package contracts

- Backend is the source of truth for API shapes; frontend MUST NOT invent
  parallel DTOs.
- Breaking API changes MUST update OpenAPI, regenerate Orval, and adjust
  consuming pages in the same change set.

## Development Workflow

- Read `docs/CODEBASE.md` before structural changes.
- Constitution Check in implementation plans MUST pass before design proceeds.
- Features MUST be verified manually against acceptance scenarios in the spec.
- No test gates in CI or review checklists until constitution is amended.
- Complexity (extra abstraction, new package, new service) MUST be documented in
  the plan's Complexity Tracking table with rejected simpler alternatives.

## Governance

- This constitution is the highest authority for engineering practice in this
  repo. Where any template, skill, or agent rule conflicts — especially on
  testing — **this document wins**.
- Amendments require updating `.specify/memory/constitution.md`, bumping
  version per semver, and syncing dependent templates under `.specify/templates/`.
- **Version policy**: MAJOR = principle removal or redefinition (e.g.,
  re-enabling testing); MINOR = new principle or material expansion; PATCH =
  clarifications and non-semantic edits.
- All PRs SHOULD confirm compliance with Core Principles and applicable package
  rules; reviewers MAY block on violations of NON-NEGOTIABLE principles.
- Runtime development guidance: `docs/CODEBASE.md`, `AGENTS.md`.

**Version**: 1.2.0 | **Ratified**: 2026-07-07 | **Last Amended**: 2026-07-22
