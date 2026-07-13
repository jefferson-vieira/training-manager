# Implementation Plan: User Profile Screen

**Branch**: `001-user-profile` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-user-profile/spec.md`

## Summary

Add a read-only user profile screen at `/profile` that shows the four measurements
captured during onboarding — weight, height, body fat percentage, and age — plus a
"Sair da conta" logout action. Data comes from the existing `GET /me` endpoint
(Orval-generated `getUser()`), which already returns all four values and responds
`404` when the user has no profile. The screen is a Next.js Server Component that
fetches `/me` and, mirroring the home flow, redirects to `/onboarding` before
render on any non-200 response. The existing bottom navigation is wired so the
`UserRound` icon links to `/profile` and reflects the active route. Logout uses the
better-auth client (`authClient.signOut`) and returns the user to `/login`.

**No backend changes and no Orval regeneration are required** — the contract already
exists. This is a frontend-only change in `packages/web`.

## Technical Context

**Language/Version**: TypeScript (Node v24.14.0 per `.nvmrc`)

**Primary Dependencies**: Next.js 16 (App Router) + React 19 + Tailwind 4 + shadcn/ui; better-auth 1.5.1 client; Orval-generated fetch client; dayjs (already present)

**Storage**: N/A for this feature (read-only consumption of `GET /me`; `UserProfile` persisted by onboarding)

**Testing**: **NONE** — Constitution Principle I forbids all automated tests. Manual verification only (chrome-devtools MCP per CLAUDE.md UI validation).

**Target Platform**: Web (responsive mobile 320px + desktop 1280px+)

**Project Type**: npm workspaces monorepo — change is isolated to `packages/web`

**Performance Goals**: Single server-side `/me` fetch; backend endpoint already < 200ms p95; RSC render, no client waterfall

**Constraints**: No new npm dependencies; reuse existing components/tokens; no API contract change → no Orval regen

**Scale/Scope**: 1 new route (`/profile`), 1 modified shared component (bottom nav), 2–3 small colocated components + 1 formatting utility

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **No Automated Testing**: Plan includes zero test tasks, test infra, or test frameworks
- [x] **Code Quality**: Unit-conversion/formatting logic lives in a dedicated utility (not the component); page is a Server Component; logout isolated in a small client component
- [x] **UX Consistency**: UI reuses shadcn/ui + Tailwind design tokens; patterns match home/onboarding; Figma node `3606-608` is the visual source of truth
- [x] **Responsive Design**: Layout verified at 320px and 1280px+; touch targets ≥ 44px (icons use `p-3`/`p-4` wrappers, logout button full-height)
- [x] **Minimal Dependencies**: No new npm package added
- [x] **Performance**: Single server-side `/me` fetch via generated client; RSC render; no N+1, no extra round-trips
- [x] **Package Rules**: Change confined to `packages/web`; **no API change → no Orval regen needed**; frontend does not invent parallel DTOs (consumes generated `getUser`)

**Result**: PASS — no violations, Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-profile/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (references existing GET /me contract)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/web/src/
├── app/
│   └── (home)/
│       ├── profile/
│       │   ├── page.tsx                 # NEW — Server Component: fetch /me, redirect on non-200, render
│       │   └── _components/
│       │       ├── profile-field.tsx    # NEW — labelled read-only value row (+ empty state)
│       │       └── logout-button.tsx    # NEW — "use client" — authClient.signOut → /login
│       └── _components/
│           └── bottom-nav.tsx           # MODIFIED — "use client"; UserRound → Link /profile; active state via usePathname
└── lib/
    └── format.ts                        # NEW — pure formatters: grams→kg, cm, bodyFat(0–1000)→%, age
```

**Structure Decision**: Place the page inside the existing `(home)` route group as
`app/(home)/profile/page.tsx` so it resolves to `/profile` and can reuse the
colocated `_components/bottom-nav.tsx` (which also pulls in `ChatOpenButton`) via a
relative import — no file relocation needed. Route protection is already provided by
`proxy.ts` (any non-`/login` route requires a session cookie). Backend and generated
client are untouched.

## Complexity Tracking

> No Constitution violations — section intentionally empty.
