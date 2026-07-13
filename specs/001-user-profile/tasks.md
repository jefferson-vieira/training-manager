---

description: "Task list for User Profile Screen"
---

# Tasks: User Profile Screen

**Input**: Design documents from `/specs/001-user-profile/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: **FORBIDDEN** — Constitution Principle I prohibits all automated tests. Verification is manual (chrome-devtools MCP per `CLAUDE.md`).

**Organization**: Tasks are grouped by user story for independent implementation and manual verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story the task belongs to (US1, US2, US3)
- Exact file paths are included in each description.

## Path Conventions

- **Web**: `packages/web/src/` (app, components, lib)
- **Generated (do not edit)**: `packages/web/src/lib/api/fetch-generated/`

## Scope note (important)

This is a **frontend-only** feature. `GET /me` already returns all four values and
`404`s when no profile exists, and the Orval client already exports `getUser()`.
**No backend changes, no Prisma migration, and no `npx orval` regeneration.**

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing contract is ready to consume; no code changes.

- [ ] T001 Confirm `getUser` is exported by `packages/web/src/lib/api/fetch-generated/index.ts` and that `GET /me` returns 200 (with profile) and 404 (without) via `http://localhost:3333/docs` — no regen required

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The `/profile` route backbone that US1 renders into and US3 mounts onto.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Create the profile route Server Component shell at `packages/web/src/app/(home)/profile/page.tsx`: import the generated client with an alias (`import { getUser as getProfile } from '@/lib/api/fetch-generated'`), fetch it server-side, `redirect('/onboarding')` from `next/navigation` when `res.status !== 200` (before rendering), render a responsive page container, and mount `<BottomNav />` from `../_components/bottom-nav` (satisfies FR-001, FR-013)

**Checkpoint**: Visiting `/profile` fetches `/me`, redirects to `/onboarding` when there is no profile, and renders an empty shell with the bottom nav.

---

## Phase 3: User Story 1 - View my profile information (Priority: P1) 🎯 MVP

**Goal**: Show the four onboarding measurements (weight, height, body fat %, age) as read-only, human-readable values on `/profile`.

**Independent Verification**: Logged in with a completed profile, open `/profile` and confirm all four values display with labels, correct units, no editable fields, and match `GET /me` data.

### Implementation for User Story 1

- [ ] T003 [P] [US1] Create pure formatters in `packages/web/src/lib/format.ts`: `formatWeight` (grams → kg), `formatHeight` (cm), `formatBodyFat` (0–1000 → %), `formatAge` (years); each returns `"—"` for `null`/`undefined` (FR-007, FR-014)
- [ ] T004 [P] [US1] Create `packages/web/src/app/(home)/profile/_components/profile-field.tsx`: a labelled, read-only value row (label + formatted value) that renders the placeholder when the value is empty; reuse shadcn/ui + Tailwind tokens (FR-006, FR-014)
- [ ] T005 [US1] In `packages/web/src/app/(home)/profile/page.tsx`, render weight, height, body fat, and age using `ProfileField` + the `lib/format.ts` formatters with data from `res.data`, laid out to match Figma node `3606-608` (FR-002, FR-003, FR-004, FR-005, FR-007) — depends on T002, T003, T004
- [ ] T006 [US1] Validate the profile screen with chrome-devtools MCP at 320px and 1280px+: no overflow/clipping, values match onboarding data, no console errors or failed requests, and layout matches Figma `3606-608` (FR-015, SC-001, SC-003, SC-005, SC-006)

**Checkpoint**: User Story 1 is fully functional and manually verifiable — this is the MVP.

---

## Phase 4: User Story 2 - Reach the profile from the bottom navigation (Priority: P1)

**Goal**: The `UserRound` icon in the bottom nav opens `/profile` and reflects the active route.

**Independent Verification**: From `/`, tap the `UserRound` icon → lands on `/profile`; the active nav item reflects the current route.

### Implementation for User Story 2

- [ ] T007 [US2] In `packages/web/src/app/(home)/_components/bottom-nav.tsx`, add `"use client"` and replace the `UserRound` `<button>` with `<Link href="/profile">` (keep `House` → `/`) (FR-008)
- [ ] T008 [US2] In the same `bottom-nav.tsx`, use `usePathname()` from `next/navigation` to apply an active-state style to the current item (profile active on `/profile`, home on `/`), using Tailwind tokens (FR-009) — depends on T007 (same file)
- [ ] T009 [US2] Validate with chrome-devtools MCP: tapping `UserRound` from `/` navigates to `/profile`, and the active indication is correct on both `/` and `/profile` (SC-002)

**Checkpoint**: Navigation to the profile works from anywhere the bottom nav is shown.

---

## Phase 5: User Story 3 - Log out from the profile (Priority: P2)

**Goal**: "Sair da conta" ends the session and returns the user to `/login`.

**Independent Verification**: On `/profile`, tap "Sair da conta" → session ends, app navigates to `/login`, and protected routes are blocked afterward.

### Implementation for User Story 3

- [ ] T010 [P] [US3] Create `packages/web/src/app/(home)/profile/_components/logout-button.tsx` (`"use client"`): a "Sair da conta" button (reuse shadcn/ui `Button` from `packages/web/src/components/ui/` if present) that calls `authClient.signOut({ fetchOptions: { onSuccess: () => router.push('/login') } })` using `useRouter` from `next/navigation` and `authClient` from `@/lib/auth`; surface error feedback and keep it retryable on failure (FR-010, FR-011, log-out-failure edge case)
- [ ] T011 [US3] Mount `<LogoutButton />` in `packages/web/src/app/(home)/profile/page.tsx` at the placement shown in Figma `3606-608` (FR-010) — depends on T002, T010
- [ ] T012 [US3] Validate with chrome-devtools MCP: logout ends the session, redirects to `/login`, and revisiting `/` or `/profile` redirects to `/login` (FR-012, SC-004)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T013 [P] UX consistency pass on `/profile`: reuse shadcn/ui components and Tailwind design tokens (no hardcoded colors/spacing), coherent copy/iconography with the Fit.ai brand, ≥ 44px touch targets
- [ ] T014 Run all `specs/001-user-profile/quickstart.md` scenarios end-to-end (with-profile, no-profile redirect, nav, logout, missing-value placeholder, responsive)
- [ ] T015 [P] Confirm no regressions: `git diff` shows no changes under `packages/web/src/lib/api/fetch-generated/` or `packages/backend/`, and no new entries in `packages/web/package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational (T002)
- **Polish (Phase 6)**: Depends on the desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (T002). No dependency on other stories.
- **US2 (P1)**: Depends on Foundational (the `/profile` route must exist as the nav target). Otherwise isolated to `bottom-nav.tsx`.
- **US3 (P2)**: Depends on Foundational (T002) to mount the button. Otherwise isolated to the logout component.

### Within Each User Story

- Formatters (T003) + field component (T004) before rendering fields (T005); verify (T006) last.
- Nav link (T007) before active state (T008); both edit the same file → sequential.
- Logout component (T010) before mounting it (T011); verify (T012) last.

### File-conflict notes (why some tasks are NOT [P])

- `page.tsx` is touched by T002, T005, T011 → these are sequential.
- `bottom-nav.tsx` is touched by T007, T008 → sequential.
- New files (`lib/format.ts`, `profile-field.tsx`, `logout-button.tsx`) have no conflicts → safe to build in parallel.

### Parallel Opportunities

- T003 and T004 (US1, different new files) can run in parallel.
- T010 (US3 logout component) can be built in parallel with US1's T003/T004 — all separate new files.
- US2's `bottom-nav.tsx` edits are independent of the new profile files and can proceed in parallel with US1/US3 component creation.

---

## Parallel Example: after Foundational (T002)

```bash
# These create independent new files and can run together:
Task: "T003 Create formatters in packages/web/src/lib/format.ts"
Task: "T004 Create profile-field.tsx in .../profile/_components/"
Task: "T010 Create logout-button.tsx in .../profile/_components/"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational (T002) — creates the route + redirect backbone
3. Phase 3: User Story 1 (T003–T006)
4. **STOP and VALIDATE**: verify US1 against its acceptance scenarios (view data + no-profile redirect)
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → route backbone ready
2. US1 → verify → demo (MVP: view profile + redirect)
3. US2 → verify → demo (reachable from bottom nav)
4. US3 → verify → demo (logout)
5. Polish → final quickstart pass

---

## Notes

- Frontend-only: no backend, Prisma, or Orval-regen tasks by design.
- [P] = different files, no dependencies; [Story] label maps each task to a user story.
- Each user story is independently completable and manually verifiable.
- Constitution forbids automated tests — none included.
- Commit after each task or logical group.
