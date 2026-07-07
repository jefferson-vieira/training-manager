# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (Node v24.14.0 per `.nvmrc`)

**Primary Dependencies**: Fastify 5 + Prisma 7 (backend); Next.js 16 + React 19 + Tailwind 4 + shadcn (web)

**Storage**: PostgreSQL via Prisma (`packages/backend/prisma/`)

**Testing**: **NONE** — Constitution Principle I forbids all automated tests. Manual verification only.

**Target Platform**: Web (responsive mobile + desktop); API on Node server

**Project Type**: npm workspaces monorepo — `packages/backend` + `packages/web`

**Performance Goals**: Backend p95 < 200ms for standard endpoints; frontend avoids bundle bloat and client waterfalls

**Constraints**: Minimal new dependencies; snake_case DB columns; Orval-generated API client

**Scale/Scope**: [domain-specific, e.g., single feature slice, N screens, M endpoints]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] **No Automated Testing**: Plan includes zero test tasks, test infra, or test frameworks
- [ ] **Code Quality**: Business logic placed in use-cases (backend) or hooks/utilities (web), not handlers/components
- [ ] **UX Consistency**: UI reuses shadcn/ui and design tokens; patterns match existing pages
- [ ] **Responsive Design**: Layout works at 320px and 1280px+; touch targets ≥ 44px
- [ ] **Minimal Dependencies**: Any new npm package justified with cost/alternatives analysis
- [ ] **Performance**: Backend avoids N+1; frontend uses RSC/streaming where appropriate; AI routes stream
- [ ] **Package Rules**: Changes in correct workspace; API changes include Orval regen plan

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/
├── backend/
│   ├── src/
│   │   ├── routes/          # HTTP handlers, Zod validation
│   │   ├── use-cases/       # Business logic
│   │   ├── schemas/         # Response contracts (OpenAPI)
│   │   ├── dtos/            # Request contracts
│   │   └── lib/             # db, auth, shared utilities
│   └── prisma/
│       └── schema.prisma
└── web/
    └── src/
        ├── app/               # Next.js App Router pages
        │   └── (route)/_components/  # Colocated UI
        ├── components/
        │   ├── ui/            # shadcn/ui
        │   └── ai-elements/
        └── lib/
            ├── api/fetch-generated/  # Orval client (generated)
            ├── dal.ts
            └── fetch.ts
```

**Structure Decision**: npm workspaces monorepo. Backend owns API contracts;
web consumes via Orval-generated client. No test directories per constitution.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., new npm dependency] | [current need] | [why existing stack insufficient] |
| [e.g., extra abstraction layer] | [specific problem] | [why direct approach insufficient] |
