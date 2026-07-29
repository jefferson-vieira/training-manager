---

description: "Task list for 008-login-signup-redesign"
---

# Tasks: Login e Criar Conta com Banner

**Input**: Design documents from `/specs/008-login-signup-redesign/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **FORBIDDEN** — Constitution Principle I prohibits all automated tests. No test tasks appear below. Verification is manual, per [quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story so each can be implemented and manually verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `packages/backend/src/`
- **Web**: `packages/web/src/`
- **Generated (do not edit)**: `packages/backend/src/generated/`, `packages/web/src/lib/api/fetch-generated/`

> **No Prisma migration and no Orval regeneration in this feature.** `User`,
> `Account` and `Session` already exist; `/api/auth/*` is registered
> `schema: { hide: true }` and stays out of `/openapi.json` (research R12).

> **Forms follow the official shadcn + react-hook-form integration**
> (<https://ui.shadcn.com/docs/forms/react-hook-form>): `Controller` + the
> `Field` family, with `zodResolver`. The legacy `@shadcn/form` component is
> **not** added — it would pull `radix-ui` into a Base UI project (research R7).
> Nothing that the `field` primitive already provides gets hand-rolled: the
> `ou` divider is `FieldSeparator`, the checkbox row is
> `Field orientation="horizontal"`, and supporting text is `FieldDescription`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install the form dependencies, bring in the missing UI primitives, and remove a fixed-height violation from the base input.

- [X] T001 [P] Install the form stack in the web workspace only: `npm install react-hook-form@7.83.0 @hookform/resolvers@5.5.7 -w packages/web` — confirm both land in `packages/web/package.json` and **not** in the root manifest (Constitution Principle V, research R1)
- [X] T002 [P] Add the missing design-system primitives from `packages/web`: `npx shadcn@latest add @shadcn/field @shadcn/checkbox @shadcn/label` — creates `packages/web/src/components/ui/field.tsx`, `checkbox.tsx`, `label.tsx`. **Do not add `@shadcn/form`** (research R7)
- [X] T003 Inspect the three files created by T002 in `packages/web/src/components/ui/`; if the CLI emitted the Radix variant, rewrite the imports to `@base-ui/react/*` to match `input.tsx`/`button.tsx` and **do not install `radix-ui`**. Confirm `field.tsx` exports `Field`, `FieldGroup`, `FieldLabel`, `FieldDescription`, `FieldError` and `FieldSeparator` — the two screens use all six (research R7)
- [X] T004 [P] In `packages/web/src/components/ui/input.tsx`, change `h-9` to `min-h-9` in the `cn(...)` class list — removes the fixed height with no visual change for single-line inputs (research R8)

**Checkpoint**: `useForm`/`zodResolver` are importable, the six `Field` exports plus `Checkbox` and `Label` come from `@/components/ui/*` built on Base UI, and no `radix-ui` entry exists in `packages/web/package.json`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend configuration, route protection, domain helpers and the shared `(auth)` shell that every story renders inside.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 [P] In `packages/backend/src/lib/auth.ts`, add `session: { expiresIn: 60 * 60 * 24 * 30 }` to the `betterAuth({...})` call so a remembered session lasts 30 days instead of the 7-day default (FR-003, research R2)
- [X] T006 [P] In `packages/backend/src/lib/auth.ts`, add `rateLimit: { enabled: true, storage: 'memory', customRules: { '/sign-in/email': { window: 300, max: 10 } } }` — `enabled` must be explicit because it defaults to `false` outside production (FR-024, research R3)
- [X] T007 [P] In `packages/backend/src/index.ts`, inside the `/api/auth/*` catch-all handler, set `headers.set('x-forwarded-for', request.ip)` before constructing the `new Request(...)` — without it the rebuilt WHATWG request carries no client IP and the limiter cannot bucket per origin (FR-024, research R4)
- [X] T008 [P] In `packages/web/src/proxy.ts`, change `publicRoutes` to `new Set(['/login', '/signup'])` so the new route is reachable unauthenticated and authenticated visitors are redirected away from it (FR-007, FR-015)
- [X] T009 [P] Create `packages/web/src/helpers/auth-schemas.ts` exporting `signInSchema` and `signUpSchema` (Zod 4) with the fields, rules and pt-BR messages in [data-model.md](./data-model.md) — login must **not** validate password length (SC-007)
- [X] T010 [P] Create `packages/web/src/helpers/auth-error-message.ts` mapping better-auth `error.status`/`error.code` to pt-BR copy per the table in research R6, with a generic fallback; 429 and invalid-credential copy must never reveal whether the e-mail exists (FR-006, FR-025, SC-007)
- [X] T011 [P] Create `packages/web/src/app/(auth)/layout.tsx` as a Server Component: a minimal centered white panel wrapping `{children}`, no banner yet — US4 grows it into the responsive two-column shell
- [X] T012 [P] Create `packages/web/src/app/(auth)/_components/google-auth-button.tsx` (`"use client"`) generalizing the existing `sign-in-with-google.tsx`: a `mode: 'signin' | 'signup'` prop switches the label between "Fazer login com o Google" and "Criar conta com o Google"; use `Button variant="outline" size="xl"` with `className="w-full"` and the `google.svg` icon at 20px (FR-012, FR-013)

**Checkpoint**: Backend enforces 30-day sessions and per-origin rate limiting; `/signup` is a public route; schemas, error copy and the shared shell pieces exist.

---

## Phase 3: User Story 1 - Entrar com e-mail e senha (Priority: P1) 🎯 MVP

**Goal**: An existing e-mail/password user can sign in — the flow that is currently impossible, since `/login` only offers Google.

**Independent Verification**: With an e-mail/password user in the local database, open `/login`, submit the form, and confirm a session is created and the user reaches the authenticated area. Run Cenários A, D (login half), E and F of [quickstart.md](./quickstart.md).

### Implementation for User Story 1

- [X] T013 [US1] Create `packages/web/src/hooks/use-sign-in-form.ts`: calls `useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '', rememberMe: false }, mode: 'onSubmit', reValidateMode: 'onChange' })`, and returns `{ form, onSubmit }` where `onSubmit` calls `authClient.signIn.email({ email, password, rememberMe })`, routes server failures to `toast()` via `auth-error-message.ts`, and redirects to `/` on success (FR-002, FR-005, FR-006, research R13)
- [X] T014 [US1] Create `packages/web/src/app/(auth)/login/sign-in-form.tsx` (`"use client"`) consuming the T013 hook: `<form onSubmit={form.handleSubmit(onSubmit)}>` wrapping a `FieldGroup`, one `Controller` per field rendering `<Field data-invalid={fieldState.invalid}>` + `FieldLabel` + `Input` — `min-h-11` on the inputs, `autocomplete="email"` and `"current-password"` — and a submit `Button size="xl" className="w-full" loading={form.formState.isSubmitting}` (FR-001, FR-016, FR-020, FR-022)
- [X] T015 [US1] In `packages/web/src/app/(auth)/login/sign-in-form.tsx`, add the "Manter conectado" row as `<Field orientation="horizontal">` inside its own `Controller`, binding `checked={field.value}` / `onCheckedChange={field.onChange}` on `Checkbox` with a `FieldLabel className="font-normal"` — `register` cannot bind the Base UI checkbox API (FR-003, research R13)
- [X] T016 [US1] In `packages/web/src/app/(auth)/login/sign-in-form.tsx`, render "Esqueci minha senha" as a non-interactive `<span>` — styled per the design but **not** a link, not focusable, absent from the tab order (FR-004)
- [X] T017 [US1] Wire inline errors in `packages/web/src/app/(auth)/login/sign-in-form.tsx`: `aria-invalid={fieldState.invalid}` on each `Input` and `{fieldState.invalid && <FieldError errors={[fieldState.error]} />}` inside the `Field`, so each message is tied to its control (FR-005, FR-023)
- [X] T018 [US1] Rewrite `packages/web/src/app/(auth)/login/page.tsx` as a Server Component composing the heading ("Bem-vindo" / "Faça login para acessar seu treino."), `<SignInForm />`, `<FieldSeparator>ou</FieldSeparator>` and `<GoogleAuthButton mode="signin" />`; delete the now-unused `packages/web/src/app/(auth)/login/sign-in-with-google.tsx` (FR-012, FR-013)
- [X] T019 [US1] Manually verify Cenários A, D (login), E and F of [quickstart.md](./quickstart.md) — including that inline errors appear only after the first submit and clear as you type (`reValidateMode: 'onChange'`), that `training-manager.session_token` is `Expires: Session` when "Manter conectado" is unchecked and ~30 days out when checked, and that the 11th wrong password returns 429 with the generic wait toast

**Checkpoint**: Sign-in with e-mail and password works end to end, with both error channels, session duration and brute-force protection behaving as specified.

---

## Phase 4: User Story 2 - Criar conta com e-mail e senha (Priority: P2)

**Goal**: A visitor with no account can register with name, e-mail and password and land in onboarding.

**Independent Verification**: Open `/signup` with a fresh e-mail, complete registration, and confirm the account is created, the session starts and the user reaches `/onboarding`. Run Cenários B, C and D (signup half) of [quickstart.md](./quickstart.md).

### Implementation for User Story 2

- [X] T020 [US2] Create `packages/web/src/hooks/use-sign-up-form.ts`: same `useForm` shape as T013 but bound to `signUpSchema` with `defaultValues: { name: '', email: '', password: '' }`; `onSubmit` calls `authClient.signUp.email({ name, email, password })`, maps `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` to the toast copy from `auth-error-message.ts`, and redirects to `/onboarding` on success (FR-009, FR-010, FR-016)
- [X] T021 [US2] Create `packages/web/src/app/(auth)/signup/sign-up-form.tsx` (`"use client"`) consuming the T020 hook: a `Controller`-per-field `FieldGroup` for nome, e-mail and senha with `min-h-11` and `autocomplete="name"` / `"email"` / `"new-password"`, a permanent `<FieldDescription>Mínimo de 8 caracteres.</FieldDescription>` under the password field, the same `FieldError` wiring as T017, and a submit `Button size="xl" className="w-full" loading={form.formState.isSubmitting}` (FR-008, FR-016, FR-020, FR-022, FR-023)
- [X] T022 [US2] In `packages/web/src/app/(auth)/signup/sign-up-form.tsx`, render the terms notice as a `FieldDescription` (the pattern the `signup-05` block uses for exactly this text) with "Termos de uso" and "Política de privacidade" emphasized as non-interactive `<span>`s — visible per the design, not focusable, absent from the tab order (FR-011)
- [X] T023 [US2] Create `packages/web/src/app/(auth)/signup/page.tsx` as a Server Component composing the heading ("Criar conta" / "Junte-se a nós e transforme seus resultados."), `<SignUpForm />`, `<FieldSeparator>ou</FieldSeparator>` and `<GoogleAuthButton mode="signup" />` (FR-007, FR-012, FR-013)
- [X] T024 [US2] Manually verify Cenários B, C and D (signup) of [quickstart.md](./quickstart.md) — Cenário C is the account-collision rule: a Google-created e-mail must be refused with the same "já está em uso" copy and must not gain a password credential (FR-010, SC-009)

**Checkpoint**: Registration works end to end and the Google/password collision behaves exactly as clarified.

---

## Phase 5: User Story 3 - Navegar entre entrar e criar conta (Priority: P2)

**Goal**: Each screen offers a direct path to the other, making the pair usable as a real flow.

**Independent Verification**: From `/login` follow "Criar conta", then from `/signup` follow "Entrar" and return — no console errors, both routes reachable unauthenticated. Run Cenário G of [quickstart.md](./quickstart.md).

**Note**: T025 edits the file created in T018 and T026 edits the file created in T023, so this phase follows US1 and US2 rather than running beside them.

### Implementation for User Story 3

- [X] T025 [US3] In `packages/web/src/app/(auth)/login/page.tsx`, add the footer line "Não tem uma conta? **Criar conta**" as a `FieldDescription` wrapping a `LinkButton` (`@/components/ui/link`) pointing at `/signup` — the composition the `signup-05` block uses for this line (FR-014)
- [X] T026 [US3] In `packages/web/src/app/(auth)/signup/page.tsx`, add the footer line "Já tem uma conta? **Entrar**" as a `FieldDescription` wrapping a `LinkButton` pointing at `/login` (FR-014)
- [X] T027 [US3] Manually verify Cenário G of [quickstart.md](./quickstart.md), including that an authenticated visitor hitting `/login` or `/signup` directly is redirected to the authenticated area by `proxy.ts` (FR-015)

**Checkpoint**: The two screens form a navigable pair.

---

## Phase 6: User Story 4 - Apresentação com banner em desktop e mobile (Priority: P3)

**Goal**: The presentation layer — photographic banner beside the form from 1024px, photo-topped white sheet below it.

**Independent Verification**: Open both routes at 320px, 402px, 768px, 1023px, 1024px and 1280px and compare against design variants `1a`/`1c` (login) and `2a`/`2b` (signup). Run Cenário H of [quickstart.md](./quickstart.md).

### Implementation for User Story 4

- [X] T028 [P] [US4] Create `packages/web/src/app/(auth)/_components/auth-banner.tsx`: `next/image` with `fill`, `priority`, `sizes="(min-width: 1024px) 52vw, 100vw"` and `className="object-cover object-[45.561%_50%]"` over `/login-bg.png`; a sibling gradient overlay (`linear-gradient(243deg, transparent 34%, #000 100%)` on desktop, `to top` from black at 2% to transparent at 66% on mobile); the FIT.AI logo; and, at `lg` only, the headline "O app que vai transformar a forma como você treina." plus the subtitle "Planos personalizados, acompanhamento de consistência e um Coach IA que ajusta o treino com você." in `font-heading` (FR-017, FR-018, Performance principle, research R10)
- [X] T029 [P] [US4] Create `packages/web/src/app/(auth)/_components/auth-footer.tsx`: the FIT.AI copyright line and the "Feito com ♥ por Jefferson Vieira da Silva" credit linking to LinkedIn with `target="_blank"` and `rel="noopener noreferrer"`, both 12px `font-heading` in `muted-foreground` (FR-019)
- [X] T030 [US4] Rewrite `packages/web/src/app/(auth)/layout.tsx` into the responsive shell: mobile-first flex column with the banner on top and the form in a white sheet with `rounded-t-2xl`; at `lg:` a two-column row with the banner sized to the design's 664px share and the form panel taking the rest, `<AuthFooter />` pinned to the bottom of the panel (FR-017, FR-018, FR-019, FR-020, research R9)
- [X] T031 [US4] In `packages/web/src/app/(auth)/login/page.tsx` and `packages/web/src/app/(auth)/signup/page.tsx`, apply the design's heading split with **CSS only** (`hidden lg:flex` / `lg:hidden`): the per-screen heading pair shows from `lg` up, while below `lg` the sheet leads with the centered brand headline. **Never branch the form itself on a breakpoint** — a single `<SignInForm />` / `<SignUpForm />` instance must stay mounted across the switch or react-hook-form loses the typed values (research R13)
- [X] T032 [US4] Validate both routes with the **chrome-devtools MCP** at 320px, 402px, 768px, 1023px, 1024px and 1280px: screenshot each, check for horizontal scroll, clipped text, overlap, console errors and failed requests, compare 402px/1280px against the design variants, and confirm the `FieldSeparator` spacing matches the design at both layouts; type into the fields at 1280px, resize across 1024px in both directions and confirm the values survive (FR-020, SC-004, SC-005, mandatory UI validation rule)

**Checkpoint**: Both screens match the design at every verified width.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T033 [P] Run Cenário I of [quickstart.md](./quickstart.md) on both routes: tab order follows the visual order, focus is always visible, "Esqueci minha senha" and the two terms never receive focus, and a password manager recognises the fields (FR-004, FR-011, FR-022, SC-006)
- [X] T034 [P] Copy pass across both screens: every string in pt-BR and consistent with the rest of the product; confirm no error message distinguishes "e-mail não cadastrado" from "senha incorreta", and that no server error is ever rendered inline under a field (FR-021, SC-007)
- [X] T035 [P] Confirm only semantic tokens are used (`primary`, `muted-foreground`, `border`, `destructive`, …) with no literal colours, that no element carries a fixed `h-*` — `min-h-*` only — and that nothing the `field` primitive provides was hand-rolled (no bespoke divider, label or inline-error markup) (Constitution Principles III and IV, project UI rules)
- [X] T036 [P] Run `npm run lint` in `packages/web` and `packages/backend`; remove any dead code left by the login rewrite
- [X] T037 [P] Run `npm run build` in `packages/web` and `packages/backend`
- [X] T038 Full pass of [quickstart.md](./quickstart.md) Cenários A–I plus its final checklist, confirming no automated test was introduced (Constitution Principle I)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: needs Phase 1 (the forms import `useForm`, `zodResolver` and the `Field` family) — **blocks all user stories**
- **US1 (Phase 3)**: needs Phase 2
- **US2 (Phase 4)**: needs Phase 2 — independent of US1
- **US3 (Phase 5)**: needs US1 and US2, because it edits the two `page.tsx` files they create
- **US4 (Phase 6)**: needs Phase 2; independent of US1–US3 in principle, though T031 touches both pages and so lands after them in practice
- **Polish (Phase 7)**: needs every story you intend to ship

### User Story Dependencies

- **US1 (P1)**: no dependency on other stories — the MVP
- **US2 (P2)**: no dependency on other stories
- **US3 (P2)**: edits files owned by US1 and US2 — sequence after both
- **US4 (P3)**: presentation only; US1–US3 are functional without it, exactly as the spec states

### Within Each User Story

- Hook before the form component (the component consumes `{ form, onSubmit }`)
- Form component before the page (the page composes the form, the separator and the Google button)
- Implementation before manual verification

### Parallel Opportunities

- T001, T002 and T004 (Phase 1) — T003 waits on T002
- All of Phase 2 — T005 through T012 touch eight distinct files
- US1 and US2 can be built side by side by two people once Phase 2 lands
- T028 and T029 (Phase 6)
- T033 through T037 (Phase 7)

---

## Parallel Example: Phase 2

```bash
# Backend configuration, route protection and web helpers — all distinct files:
Task: "Add session.expiresIn 30d in packages/backend/src/lib/auth.ts"
Task: "Forward x-forwarded-for in packages/backend/src/index.ts"
Task: "Add /signup to publicRoutes in packages/web/src/proxy.ts"
Task: "Create packages/web/src/helpers/auth-schemas.ts"
Task: "Create packages/web/src/helpers/auth-error-message.ts"
Task: "Create packages/web/src/app/(auth)/_components/google-auth-button.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup
2. Phase 2: Foundational — blocks everything
3. Phase 3: User Story 1
4. **STOP and VALIDATE**: Cenários A, D, E, F
5. At this point the product's real gap is closed — e-mail/password users can finally get in

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → verify → ship (MVP)
3. US2 → verify → ship
4. US3 → verify → ship (the pair becomes a real flow)
5. US4 → verify → ship (the design lands)

### Parallel Team Strategy

After Phase 2: developer A takes US1, developer B takes US2, developer C starts US4's banner and footer components (T028, T029). US3 and T030–T031 merge once the pages exist.

---

## Notes

- 38 tasks; no automated tests, per Constitution Principle I
- No Prisma migration, no `npx orval` — see the banner at the top of this file
- Two new npm dependencies (`react-hook-form`, `@hookform/resolvers`), web workspace only, justified in the plan's Complexity Tracking table. `field`/`checkbox`/`label` remain vendored registry source, not packages
- The `field` primitive supplies the divider (`FieldSeparator`), the checkbox row (`Field orientation="horizontal"`) and all supporting text (`FieldDescription`) — none of these get hand-built
- The form component must stay mounted across the 1024px switch — branch layout with CSS, never with two form instances
- Commit after each task or logical group
- Every frontend change is validated with the chrome-devtools MCP before it counts as done
