---

description: "Task list for 011-profile-photo-crop"
---

# Tasks: Atualização da Foto de Perfil com Recorte

**Input**: Design documents from `/specs/011-profile-photo-crop/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: **FORBIDDEN** — Constitution Principle I prohibits all automated tests. Verification is manual, per [quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story so each can be implemented and manually verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths included in every task

## Path Conventions

- **Backend**: `packages/backend/src/` (routes, use-cases, schemas, dtos, lib, config)
- **Web**: `packages/web/src/` (app, components, lib, helpers)
- **Generated (never edit)**: `packages/backend/src/generated/`, `packages/web/src/lib/api/fetch-generated/`, `packages/web/src/lib/api/schemas/`

---

## Implementation status (2026-08-05)

**51 of 54 tasks complete.** All code written, typechecked, lint-clean, and building in both workspaces. Verified end to end against **real Supabase storage** — backend via `curl`, frontend via Chrome DevTools.

**Two defects found and fixed by verification:**

1. **Zod validation errors returned `500` instead of `400`** — app-wide, not just this feature. Schema-validation failures fell through to the generic branch of `utils/error-handler.ts`. Fixed with `hasZodFastifySchemaValidationErrors`.
2. **Touch targets were 32px, below FR-033's 44px minimum.** The design system's `size-8` icon variant and default menu-item height are both 32px. Added `min-h-11`/`min-w-11` (constitution permits `min-h-*` for the 44px target; a fixed height is not) to the zoom buttons, dialog actions, and both menu items. Re-measured at 320px: all ≥44px.

**Remaining 3 tasks** need a human at the keyboard — they are not blocked, just not automatable:

- **T049** — screen-reader pass (VoiceOver) and contrast check in light **and** dark theme.
- **T051** — performance/memory: 20 MP source responsiveness, no long main-thread task during encode, heap snapshot across ten flows.
- **T054** — final walk of the quickstart Definition of Done.

### Verified against live storage

| Check | Result |
|---|---|
| Three-step handshake (sign → PUT → commit) | ✅ 200/200/200, `user.image` updated |
| Object key shape `avatars/{userId}/{uuid}.webp` | ✅ |
| Non-image bytes rejected at commit | ✅ 400 `VALIDATION_ERROR` |
| Rejected object deleted from bucket | ✅ HeadObject → NotFound |
| Commit a key never uploaded | ✅ 404 |
| Commit another user's key | ✅ 400, no storage call |
| Path traversal in key | ✅ 400 |
| Oversized `contentLength` at sign | ✅ 400 *(was 500 — fixed)* |
| Unauthenticated PUT / DELETE | ✅ 401 |
| ~~Per-user rate limit~~ | ~~✅ exactly 10 × 200 then 429~~ — limiter removed 2026-08-07, FR-027a deferred |
| Prefix sweep collapses orphans | ✅ 4 objects → 1 (committed key kept) |
| Removal clears profile + deletes object | ✅ 200, bucket count 0 |
| Removal idempotent | ✅ second DELETE → 200 |
| **Provider (Google) URL never deleted** | ✅ cleared to NULL, no delete attempted, no errors |

### Verified in the browser (Chrome DevTools)

| Check | Result |
|---|---|
| Avatar is a menu trigger labelled "Alterar foto de perfil" | ✅ `haspopup="menu"` |
| Menu shows both actions; "Remover imagem" disabled with no photo | ✅ `disabled`, not hidden |
| Menu enables "Remover imagem" once a photo exists | ✅ |
| `Esc` closes menu, focus returns to trigger | ✅ |
| Crop dialog: circular frame, single-thumb zoom slider | ✅ |
| Dialog traps focus (page behind absent from a11y tree) | ✅ |
| Zoom by keyboard (`→` steps 1 → 1.2), `−` disabled at min | ✅ |
| **Cancel issues zero network requests** | ✅ no sign call, so no write capability minted |
| Reselecting the same file reopens the dialog | ✅ (`input.value` reset) |
| Confirm → exactly 3 requests: sign → storage PUT → commit | ✅ bytes only in the middle request |
| Browser cross-origin PUT to storage | ✅ 200 — CORS correct |
| Avatar updates without reload; survives reload | ✅ |
| Removal returns initials without reload | ✅ |
| Rejected: wrong type / oversized / undecodable | ✅ correct pt-BR toast, dialog never opens |
| 320px: no horizontal scroll, dialog fits | ✅ 294px wide in a 326px viewport |
| Touch targets ≥44×44px | ✅ *(was 32px — fixed)* |
| Console errors/warnings across session | ✅ none |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies, vendored components, and the storage account this feature cannot run without.

- [X] T001 [P] Install crop library: `npm install react-easy-crop --workspace packages/web`
- [X] T002 [P] Install storage SDK and presigner: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --workspace packages/backend`
- [X] T003 Vendor UI primitives: `cd packages/web && npx shadcn@latest add dropdown-menu dialog slider`, then **verify** `packages/web/src/components/ui/{dropdown-menu,dialog,slider}.tsx` import from `@base-ui/react/*` and that `packages/web/package.json` gained no `radix-ui` entry (research R-002 — stop if Radix appears)
- [X] T004 [P] In the Supabase dashboard: create the public bucket named for `SUPABASE_S3_BUCKET` (allowed MIME `image/webp`, size limit matching `AVATAR_MAX_BYTES`), enable the S3 protocol, and generate S3 access keys — per [quickstart.md](./quickstart.md) §1.1
- [X] T005 [P] Configure bucket **CORS** for every web origin: allowed methods include `PUT`, allowed headers include `Content-Type` (research R-012 — without this the browser upload fails while `curl` succeeds)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend storage/limiter infrastructure and the shared avatar menu that both US1 and US4 hang off.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Add and validate the new environment variables in `packages/backend/src/config/env.ts`: `SUPABASE_S3_ENDPOINT`, `SUPABASE_S3_REGION`, `SUPABASE_S3_ACCESS_KEY_ID`, `SUPABASE_S3_SECRET_ACCESS_KEY`, `SUPABASE_S3_BUCKET`, `SUPABASE_URL`, `AVATAR_MAX_BYTES` *(the `AVATAR_UPLOAD_RATE_LIMIT_*` vars added here were removed on 2026-08-07 — see T009)*
- [X] T007 [P] Document every new variable with Portuguese comments in `packages/backend/.env.example`, matching the file's existing style
- [X] T008 Create `packages/backend/src/lib/storage.ts`: `S3Client` configured with `forcePathStyle: true`, the `*.storage.supabase.co` endpoint, region and credentials from env (research R-005 — all four are required and each fails differently if wrong). Export `signAvatarUpload`, `headObject`, `getObjectRange`, `deleteObject`, `listUserAvatarObjects`, `publicUrlFor`, and `isOwnedAvatarUrl`
- [X] ~~T009 [P] Create `packages/backend/src/lib/avatar-upload-rate-limit.ts`: in-memory per-user limiter mirroring the existing `packages/backend/src/lib/password-reset-rate-limit.ts` shape (`consume…Attempt(userId) → { allowed }`), configured from `AVATAR_UPLOAD_RATE_LIMIT_*` (research R-013 — better-auth's own `rateLimit` does not cover application routes)~~ — **reverted 2026-08-07**: module, env vars and the `TooManyRequestsError` mapping deleted; FR-027a deferred to a shared-store implementation
- [X] T010 [P] Create the shared avatar menu in `packages/web/src/app/(protected)/(main)/profile/_components/avatar-menu.tsx`: `Avatar` wrapped in a `DropdownMenu` trigger labelled "Alterar foto de perfil", with items "Enviar imagem" and "Remover imagem" whose handlers and disabled state are supplied by props (FR-001, FR-001a/b/c). "Remover imagem" is **disabled, not hidden**, when there is no photo
- [X] T011 Replace the static `Avatar` block in `packages/web/src/app/(protected)/(main)/profile/page.tsx` with `AvatarMenu`, passing `image` and `name` through (handlers wired in later phases)

**Checkpoint**: Storage, limiter, and the menu shell exist. The menu opens and both items render with correct enabled/disabled state, though neither does anything yet.

---

## Phase 3: User Story 1 - Change the profile photo with controlled framing (Priority: P1) 🎯 MVP

**Goal**: A user can pick an image, frame it in a circular cropper, confirm, and see their new avatar.

**Independent Verification**: quickstart S6–S16 — open `/profile`, choose "Enviar imagem", pick a JPG, pan and zoom, confirm; the Network tab shows exactly three requests with image bytes only in the middle one; the avatar updates without reload and survives a reload; the bucket holds one square WEBP ≤512×512.

### Backend contract

- [X] T012 [P] [US1] Create `packages/backend/src/dtos/CreateAvatarUploadUrlRequest.ts` — `{ contentLength: z.number().int().min(1).max(env.AVATAR_MAX_BYTES) }` with Portuguese `.meta()` descriptions, per [contracts/create-upload-url.md](./contracts/create-upload-url.md)
- [X] T013 [P] [US1] Create `packages/backend/src/dtos/UpdateUserImageRequest.ts` — `{ key: z.string().nonempty() }`, per [contracts/update-user-image.md](./contracts/update-user-image.md). No `contentType`, no `size`, no URL: every property of the object is read from storage, never accepted as a claim
- [X] T014 [P] [US1] Create `packages/backend/src/schemas/AvatarUploadUrlSchema.ts` — `{ uploadUrl, key, expiresIn }`
- [X] T015 [P] [US1] Create `packages/backend/src/schemas/UserImageSchema.ts` — `{ image: z.string() }` (non-nullable; a successful commit always yields a URL)
- [X] T016 [US1] Create `packages/backend/src/use-cases/user/CreateAvatarUploadUrl.ts`: generate the key as `avatars/{userId}/{crypto.randomUUID()}.webp` **server-side**, sign a `PutObjectCommand` with `ContentType: 'image/webp'` and `ContentLength` via `getSignedUrl(..., { expiresIn: 60 })`, return `{ uploadUrl, key, expiresIn }` (depends on T008)
- [X] T017 [US1] Create `packages/backend/src/use-cases/user/UpdateUserImage.ts` implementing the verify → commit → sweep sequence from [contracts/update-user-image.md](./contracts/update-user-image.md): (1) reject unless `key` matches `avatars/{userId}/` — **before any storage call**; (2) `HeadObject` → 404 if absent, 413 if over `AVATAR_MAX_BYTES`; (3) `GetObject` `Range: bytes=0-11` → match JPEG/PNG/WEBP magic bytes, 400 otherwise; (4) `prisma.user.update` setting `image` to the public URL; (5) sweep the user's prefix deleting all but the committed key, wrapped in `try/catch` that logs and continues. Delete the offending object on verification failure at steps 2–3 (depends on T008)
- [X] T018 [US1] Register `POST /image/upload-url` and `PUT /image` in `packages/backend/src/routes/me.routes.ts`, each guarded by `getSession()`. Handlers only wire session → use-case → reply (depends on T012–T017). *The rate-limiter consumption originally specified here was removed on 2026-08-07 along with the route's `429` response — see T009.*
- [X] T019 [US1] With the backend running, regenerate the typed client: `cd packages/web && npx orval`. Confirm `createAvatarUploadUrl` and `updateUserImage` appear in `packages/web/src/lib/api/fetch-generated/`

### Web

- [X] T020 [P] [US1] Create `packages/web/src/lib/image.ts`: decode with `createImageBitmap(file)` (off the main thread — **do not** copy the docs' `new Image()` helper), draw the `croppedAreaPixels` region to an `OffscreenCanvas` when available with a `document.createElement('canvas')` fallback, and return a **`Blob`** of `image/webp` quality `0.82` capped at 512×512 (research R-007)
- [X] T021 [P] [US1] Create `packages/web/src/lib/upload.ts`: promise-wrapped `XMLHttpRequest` `PUT` that sends the `Blob` as the body verbatim with `Content-Type: image/webp` and reports `xhr.upload.onprogress`. `fetch` cannot report upload progress — that is the whole reason this file exists
- [X] T022 [US1] Create `packages/web/src/app/(protected)/(main)/profile/actions.ts` with `'use server'`: `createAvatarUploadUrlAction` and `updateUserImageAction` calling the generated client and `revalidatePath` on the `(protected)` segment, returning plain serializable results — following the existing `app/(protected)/(main)/workout-plans/[workoutPlanId]/days/[workoutDayId]/actions.ts` pattern (depends on T019)
- [X] T023 [US1] Create `packages/web/src/app/(protected)/(main)/profile/use-avatar-photo.ts`: a single `status` value (`idle | selecting | cropping | uploading | removing`) driving the whole flow, plus `crop`, `zoom`, `croppedAreaPixels`, `progress`, and the one live object URL. Every entry transition guards on `status === 'idle'` (research R-009). Orchestrates sign → transfer → commit as one `uploading` status; all async paths use `try/catch` with a guard-clause `return` (depends on T020–T022)
- [X] T024 [US1] Create `packages/web/src/app/(protected)/(main)/profile/_components/avatar-crop-dialog.tsx`: `Dialog` containing `react-easy-crop` with `cropShape="round"`, `aspect={1}`, `showGrid={false}`, a `Slider` for zoom plus `+`/`−` `Button`s (≥44×44px, `data-icon` on any icon beside text), a progress indicator, and confirm/cancel. Lazy-load the cropper so users who never upload do not pay for it (depends on T023)
- [X] T025 [US1] Wire "Enviar imagem" in `avatar-menu.tsx` to a hidden `<input type="file" accept="image/jpeg,image/png,image/webp">` and mount `AvatarCropDialog`; pass `status` down so the menu items disable while work is in flight (depends on T010, T024)
- [X] T026 [US1] Revoke the object URL on dialog close, on successful commit, and on unmount in `use-avatar-photo.ts`; ensure only one object URL is ever live (FR-017)
- [X] T027 [US1] Verify the happy path with chrome-devtools MCP at 320px and 1280px: quickstart S6–S16, checking console errors, failed requests, and that the storage `PUT` carries no CORS error

**Checkpoint**: US1 is fully functional and independently verifiable. This is the MVP.

---

## Phase 4: User Story 2 - Abandon the change without side effects (Priority: P2)

**Goal**: Cancelling at any point leaves the profile and the interface untouched — and issues no request at all.

**Independent Verification**: quickstart S16a–g — cancel via the cancel action, `Esc`, and overlay dismissal; confirm **zero** network requests including the sign step, that reselecting the same file reopens the dialog, and that a double-confirm produces exactly one sign request and one storage `PUT`.

- [X] T028 [US2] In `use-avatar-photo.ts`, implement the cancel transitions (`cropping → idle` via cancel, `Esc`, overlay dismiss) so that **no** sign call is made — a minted URL is a live write capability nobody will use
- [X] T029 [US2] Reset the file input's `value` after every selection in `avatar-menu.tsx` so reselecting the identical file re-fires `change` and reopens the dialog (FR-010 scenario 4 — the classic bug here)
- [X] T030 [US2] Suppress dialog dismissal while `status === 'uploading'` in `avatar-crop-dialog.tsx` (disable confirm, block `Esc` and overlay close) so the dialog cannot vanish mid-request (FR-013)
- [X] T031 [US2] Verify cancellation with chrome-devtools MCP: quickstart S16a–g, watching the Network tab stays empty across all three cancel routes

**Checkpoint**: US1 and US2 both work; cancelling is provably side-effect free.

---

## Phase 5: User Story 3 - Recover clearly from rejected files and failed uploads (Priority: P3)

**Goal**: Bad files and failed uploads produce a specific, actionable message; the current avatar is never disturbed; retry preserves the framing.

**Independent Verification**: quickstart S17–S23 — a renamed PDF, an oversized image, and a truncated file each produce a distinct message with no dialog; an offline confirm keeps the dialog open with the crop intact and succeeds on retry once online.

- [X] T032 [P] [US3] Create `packages/web/src/helpers/avatar-error-message.ts` mapping rejection reasons and API error codes (`VALIDATION_ERROR`, `PAYLOAD_TOO_LARGE`, `TOO_MANY_REQUESTS`, `UNAUTHORIZED`, network failure) to Brazilian Portuguese copy, following the existing `packages/web/src/helpers/auth-error-message.ts` precedent
- [X] T033 [US3] Add client-side file validation in `use-avatar-photo.ts` before the dialog opens: extension, `file.type`, and `file.size` against a 5 MB source ceiling, rejecting straight back to `idle` with a `sonner` toast (FR-024)
- [X] T034 [US3] Treat a `createImageBitmap` rejection as the decodability check — a file whose extension and MIME look valid but cannot be decoded never reaches `cropping` (FR-025)
- [X] T035 [US3] On failure at **any** of the three upload steps, return to `cropping` with `crop`, `zoom`, and `croppedAreaPixels` intact and show the mapped error, so retry needs no reselect or reframe. Retry restarts from the sign step with a fresh URL, since the previous one may have expired (FR-016)
- [X] T036 [US3] Surface a `401` from either endpoint as a session-expired message directing the user to sign in, rather than a generic failure (spec Edge Cases)
- [X] T037 [US3] Verify rejection and failure handling with chrome-devtools MCP: quickstart S17–S23, including the offline-then-retry path

**Checkpoint**: All three upload-side stories work; failures are legible and recoverable.

---

## Phase 6: User Story 4 - Remove the current photo (Priority: P3)

**Goal**: A user can clear their photo, returning the interface to initials and deleting the stored object.

**Independent Verification**: quickstart S35–S42 plus S40a — remove a photo and confirm the initials return without reload, survive a reload and a fresh sign-in, and leave nothing in the bucket; confirm the menu item is disabled with no photo; confirm a Google-sourced photo is cleared without any delete attempted against the provider URL.

- [X] T038 [P] [US4] No response schema: removal answers `204 No Content`, declared as `204: z.undefined()` on the route, per [contracts/remove-user-image.md](./contracts/remove-user-image.md). `customFetch` skips `response.json()` on a `204`
- [X] T039 [US4] Create `packages/backend/src/use-cases/user/RemoveUserImage.ts`: read the current `image`; guard-clause return when already null (idempotency); set `image` to `null`; then delete the object **only if** `isOwnedAvatarUrl(oldUrl)` passes, wrapped in `try/catch` that logs and continues. A failed object delete still returns 204 — the user's intent was satisfied (depends on T008)
- [X] T040 [US4] Register `DELETE /image` in `packages/backend/src/routes/me.routes.ts` guarded by `getSession()`, answering `reply.status(204).send()` (depends on T038, T039; touches the same file as T018, so not parallel with it)
- [X] T041 [US4] Regenerate the client: `cd packages/web && npx orval`, confirming `removeUserImage` appears in `packages/web/src/lib/api/fetch-generated/`
- [X] T042 [US4] Add `removeUserImageAction` to `packages/web/src/app/(protected)/(main)/profile/actions.ts`, calling the generated client and `revalidatePath` on the `(protected)` segment (depends on T041)
- [X] T043 [US4] Add the `removing` transitions to `use-avatar-photo.ts`, guarded on `status === 'idle'` so removal and upload can never overlap (FR-023c), with success and failure toasts (FR-023d)
- [X] T044 [US4] Wire "Remover imagem" in `avatar-menu.tsx` to the removal handler, keeping it disabled when there is no photo or when `status !== 'idle'` (depends on T010, T043)
- [X] T045 [US4] **Verify, do not build**: confirm `socialProviders.google` in `packages/backend/src/lib/auth.ts` is not configured to overwrite user info on sign-in, so a removed photo is never repopulated (FR-023f, research R-014). If provider sync is ever enabled, `image` must be excluded
- [X] T046 [US4] Verify removal with chrome-devtools MCP: quickstart S35–S42 and S40a, including the Google-account path where **no** delete may be attempted against `googleusercontent.com`

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T047 [P] Run the server-side validation suite in [quickstart.md](./quickstart.md) S24–S31 with `curl`, bypassing the client entirely: bad magic bytes, absent object, another user's key, path traversal, oversized real object, and expired URL. (S31a–c, the rate-limit scenarios, were removed on 2026-08-07 with the limiter.) This is the section that proves FR-026 survived the presigned strategy (research R-010)
- [X] T048 [P] Verify the replacement sweep: quickstart S32–S34 — after ten successive replacements the bucket holds exactly one object for the user (SC-011)
- [ ] T049 [P] Full accessibility pass: quickstart S47–S54 — keyboard-only completion of both upload and removal, focus trap, focus restoration to the trigger, VoiceOver labels and status announcements, contrast in **both** light and dark theme
- [X] T050 [P] Responsiveness pass with chrome-devtools MCP: quickstart S43–S46 at 320px, 768px, and 1280px+, confirming ≥44×44px targets and no horizontal scroll
- [ ] T051 [P] Performance and memory pass: quickstart S55–S59 — a 20 MP source stays smooth, no long main-thread task during encode, and ten full flows leave no retained `ImageBitmap`/`Blob`
- [X] T052 Confirm no fixed `height` (`h-*`) was used for layout sizing in the new components, no CSS class exists without purpose, and every icon beside text inside `Button` carries `data-icon` (constitution Principle III, project UI conventions)
- [X] T053 Run `npm run lint` and `npm run build` in **both** workspaces; confirm no file under `packages/backend/src/generated/`, `packages/web/src/lib/api/fetch-generated/`, or `packages/web/src/lib/api/schemas/` was hand-edited
- [ ] T054 Walk the full [quickstart.md](./quickstart.md) Definition of Done checklist and confirm every acceptance scenario in US1 (1–7), US2 (1–5), US3 (1–5), and US4 (1–8) maps to a passing step

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately. T004/T005 are dashboard work and can proceed alongside the installs.
- **Foundational (Phase 2)**: depends on Setup. **Blocks every user story.**
- **User Stories (Phases 3–6)**: all depend on Foundational.
- **Polish (Phase 7)**: depends on the stories being complete.

### User Story Dependencies — stated honestly

The spec's four stories are **not** equally independent, and pretending otherwise would mislead planning:

- **US1 (P1)** — depends only on Foundational. Genuinely standalone; this is the MVP.
- **US2 (P2)** — **requires US1's crop dialog to exist.** It refines behavior of a component US1 builds; it cannot ship alone. The spec itself calls it "a small slice on top of P1."
- **US3 (P3)** — **requires US1's flow.** Same reasoning; it adds validation and error paths to an existing pipeline.
- **US4 (P3)** — **genuinely independent of US1.** It needs only the menu shell from Foundational (T010) and its own backend path. It could be built and demonstrated before US1 if desired.

The one shared-file conflict: T018 (US1) and T040 (US4) both edit `packages/backend/src/routes/me.routes.ts`. Sequence them; do not run in parallel.

### Within Each User Story

- DTOs/schemas → use-cases → routes → `npx orval` → server actions → hook → components
- The Orval regen is a hard barrier: no web task that imports the generated client may start before it

### Parallel Opportunities

- **Setup**: T001, T002, T004, T005 all in parallel (T003 after T001 to avoid concurrent `package.json` writes)
- **Foundational**: T007, T009, T010 in parallel once T006 lands; T008 in parallel with T009/T010
- **US1**: T012–T015 (four separate contract files) fully parallel; T020 and T021 parallel with each other and with the backend work up to T019
- **Cross-story**: US4's backend (T038, T039) can proceed in parallel with US1's web work, since they touch different files — until T040 needs `me.routes.ts`
- **Polish**: T047–T051 are independent verification passes and can be split across people

---

## Parallel Example: User Story 1 contracts

```bash
# Four independent contract files — no shared state:
Task: "Create packages/backend/src/dtos/CreateAvatarUploadUrlRequest.ts"
Task: "Create packages/backend/src/dtos/UpdateUserImageRequest.ts"
Task: "Create packages/backend/src/schemas/AvatarUploadUrlSchema.ts"
Task: "Create packages/backend/src/schemas/UserImageSchema.ts"
```

```bash
# Web infrastructure, parallel with all backend work above:
Task: "Create packages/web/src/lib/image.ts"
Task: "Create packages/web/src/lib/upload.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup — including the bucket, S3 keys, and **CORS**
2. Phase 2: Foundational — blocks everything
3. Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart S1–S16 plus the server-side checks in S24–S30
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → verify → demo (**MVP**)
3. US2 → verify (cancellation is provably inert)
4. US3 → verify (failures legible)
5. US4 → verify (removal complete)
6. Polish

### Parallel Team Strategy

Once Foundational lands, one developer can take **US4 end to end** (it is the only genuinely independent story) while another takes US1 → US2 → US3 as a sequential chain. Coordinate on `me.routes.ts` (T018/T040) and on the two `npx orval` runs (T019/T041).

---

## Notes

- **No automated tests.** Constitution Principle I. Every "verify" task is manual, via chrome-devtools MCP and `quickstart.md`.
- **Highest-risk task: T017's sweep.** Its exclusion filter must name the committed key explicitly — an off-by-one deletes the user's current avatar, and Supabase Storage has **no versioning** to recover it.
- **Second-highest: T039/T045's ownership check.** A Google user's `image` is a URL we do not own. The same `isOwnedAvatarUrl` helper must serve both `UpdateUserImage` and `RemoveUserImage` — never two copies of the rule.
- **Accepted risk, do not "fix" it**: concurrent saves from two clients can interleave so one sweep deletes the other's object (spec Clarifications). Deliberately unguarded. Partial mitigation would create the illusion of safety.
- **No logging requirement** was adopted (spec Clarifications), so the sweep and delete failures in T017/T039 are silent by design. `try/catch` and continue.
- Business logic stays out of route handlers and React components; async errors use `try/catch` with a guard-clause `return`, never a chained `.catch()`.
- Commit after each task or logical group.
