# Implementation Plan: Atualização da Foto de Perfil com Recorte

**Branch**: `011-profile-photo-crop` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-profile-photo-crop/spec.md`

## Summary

The Profile avatar becomes a **dropdown menu trigger** offering two actions: *Enviar imagem* and *Remover imagem* (the latter disabled when there is no photo).

*Enviar imagem* opens the native file picker; a valid image opens a Base UI dialog holding a **`react-easy-crop`** cropper in round mode at 1:1. The user pans and zooms, confirms, and the browser renders the selected region to a 512×512 WEBP off the main thread (`createImageBitmap` + `OffscreenCanvas`).

Upload uses a **presigned URL**: the browser asks the API for a short-lived signed `PUT`, sends the bytes **directly to Supabase Storage** over its S3-compatible endpoint (via `XMLHttpRequest`, so real upload progress is available), then calls the API to commit. The API never proxies image bytes.

Because the bytes bypass the API, **`PUT /me/image` verifies the uploaded object server-side before committing it** — a `HeadObject` for the real size and a 12-byte ranged `GetObject` for the magic bytes. Only then does `user.image` point at the new public URL. An object that fails verification is deleted and the request is rejected. This is what keeps FR-026 ("never trust the frontend") true under a strategy that would otherwise forfeit it — see [research.md](./research.md) R-010.

After a successful commit the API lists the user's avatar prefix and deletes every object except the current one. That single step covers replacement cleanup (FR-022) and garbage-collects orphans from abandoned uploads, without a scheduled job.

*Remover imagem* is `DELETE /me/image`: it clears `user.image` and deletes the object under the same ownership rule (FR-023b). Because a cleared field is what a provider sync would treat as "empty, populate it", the Google provider must stay configured never to overwrite `image` after account creation (FR-023f).

`POST /me/image/upload-url` is where a per-user rate limit belongs (FR-027a) — it is the endpoint that hands out a storage-write capability. **Deferred as of 2026-08-07**: the in-memory limiter was removed and no bound is enforced today; see research R-013 for the reasoning and what a real implementation needs.

Because `customFetch` is server-only (it reads `next/headers` cookies), the browser reaches the API through **Server Actions** that call the generated client and then `revalidatePath` the protected layout — which is what refreshes the avatar without a manual reload (FR-015, FR-023a). The Profile page is the app's only avatar placement today; revalidating the whole protected segment rather than just that route means any placement added later is covered without further work.

## Technical Context

**Language/Version**: TypeScript (Node v24.14.0 per `.nvmrc`)

**Primary Dependencies**: Fastify 5 + Prisma 7 + better-auth + **`@aws-sdk/client-s3`** + **`@aws-sdk/s3-request-presigner`** (backend); Next.js 16 + React 19 + Tailwind 4 + shadcn on **Base UI** (`@base-ui/react`, style `base-vega`) + **`react-easy-crop`** (web)

**Storage**: PostgreSQL via Prisma for `user.image`; Supabase Storage bucket addressed over the **S3 protocol**, written directly by the browser through presigned URLs

**Testing**: **NONE** — Constitution Principle I forbids all automated tests. Manual verification only, per [quickstart.md](./quickstart.md).

**Target Platform**: Web (responsive mobile 320px + desktop 1280px+); API on Node server

**Performance Goals**: All three endpoints p95 < 200ms excluding storage round trips; image bytes never traverse the API; crop preview smooth on a 20 MP source (SC-002); no main-thread block during encode

**Constraints**: snake_case DB columns; all API access through the Orval-generated client; `customFetch` is server-only; S3 credentials are server-only and bypass RLS; **the storage bucket needs a CORS rule for the web origin**, otherwise the browser `PUT` is blocked

**Scale/Scope**: 3 new endpoints, 3 new use-cases, 1 new backend lib module (storage), 1 verified auth config guard, 3 vendored shadcn components, 1 route-scoped hook, 3 colocated components, 1 server-action module

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial evaluation (pre-research)**

- [x] **No Automated Testing**: No test tasks, infra, or frameworks anywhere in this plan; verification is the manual script in `quickstart.md`
- [x] **Code Quality**: Crop/upload/removal orchestration lives in route-scoped hooks (`use-select-photo`, `use-upload-photo`, `use-remove-photo`), not in the components; backend logic lives in three use-cases, not in route handlers; every async path uses `try/catch` with a guard-clause `return`
- [x] **UX Consistency**: DropdownMenu, Dialog, and Slider all come from the shadcn Base UI registry matching the project's `base-vega` style; feedback uses the existing `sonner` toast; loading uses the existing `Spinner`; error copy follows the `helpers/auth-error-message.ts` precedent
- [x] **Responsive Design**: Dialog and menu are mobile-first; cropper viewport in relative units; menu items and zoom `+`/`−` controls ≥44×44px; no fixed `height` on layout elements
- [⚠] **Minimal Dependencies**: Three new runtime packages (`react-easy-crop`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`). Justified in Complexity Tracking below.
- [x] **Performance**: No N+1; image bytes never pass through the API server (the main win of this strategy); decode/encode off the main thread; cropper lazy-loaded
- [x] **Package Rules**: Backend owns the contract; `npx orval` regeneration is an explicit step; web consumes only the generated client

**Post-design re-evaluation (after Phase 1)**

- **Security gate re-checked and held.** Presigned uploads remove the API's natural chokepoint for content inspection. FR-026 is preserved by making verification a *precondition of commit* rather than a precondition of storage (R-010). An unverified object is never referenced by any profile, and is deleted.
- **New operational requirement surfaced**: bucket CORS. This is configuration, not code, and is now a step in `quickstart.md` §1.1.
- **New failure mode surfaced**: orphaned objects from uploads that are never committed. Handled by prefix sweep on commit rather than by a scheduled job (R-011).
- Dependency gate is the only one that moved, driven by explicit user direction.

**Spec reconciliation pass (2026-08-05)** — plan re-diffed against the spec after four `/speckit-clarify` rounds. Every FR-xxx and SC-xxx in the spec is now traceable to a plan artifact or a quickstart step. Four drifts corrected:

1. `research.md` R-007 still said the cropped `Blob` "converts straight to base64" — a leftover from the superseded transport that flatly contradicted R-003. Under presigned upload the blob is the XHR body, verbatim.
2. FR-027a (rate limit) had no home in the Project Structure and was uncounted in Scale/Scope. Added `lib/avatar-upload-rate-limit.ts` and R-013.
3. FR-023f (provider must not repopulate a removed photo) had no research entry. Added R-014, framed as *verify and keep* rather than *build*, since the current config already satisfies it.
4. **`quickstart.md` had lost its entire User Story 2 (cancellation) section** during the presigned rewrite — five acceptance scenarios and SC-003 were unverified. Restored as S16a–g, tightened for this design: cancelling must issue no sign request at all, since a minted URL is a wasted write capability and counts against the rate limit.

No constitution gate changed. The rate limiter adds **no** dependency — it mirrors the existing in-repo `lib/password-reset-rate-limit.ts`.

## Project Structure

### Documentation (this feature)

```text
specs/011-profile-photo-crop/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output — manual verification script
├── contracts/
│   ├── create-upload-url.md
│   ├── update-user-image.md
│   └── remove-user-image.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/
├── backend/
│   └── src/
│       ├── config/env.ts                          # + SUPABASE_S3_*, AVATAR_* vars
│       ├── lib/auth.ts                             # VERIFY ONLY — Google provider must
│       │                                           #   not overwrite `image` (FR-023f)
│       ├── dtos/CreateAvatarUploadUrlRequest.ts    # NEW — { contentLength }
│       ├── dtos/UpdateUserImageRequest.ts          # NEW — { key }
│       ├── schemas/AvatarUploadUrlSchema.ts        # NEW — { uploadUrl, key, expiresIn }
│       ├── schemas/UserImageSchema.ts              # NEW — { image }
│       ├── routes/me.routes.ts                     # + POST /image/upload-url,
│       │                                           #   PUT /image, DELETE /image
│       ├── use-cases/user/CreateAvatarUploadUrl.ts # NEW — sign a scoped PUT
│       ├── use-cases/user/UpdateUserImage.ts       # NEW — verify → commit → sweep
│       ├── use-cases/user/RemoveUserImage.ts       # NEW — clear → delete if ours
│       ├── lib/storage.ts                          # NEW — S3Client, sign, head,
│       │                                           #   range-get, delete, list, ownership
│                                                   # (lib/avatar-upload-rate-limit.ts was built here
│                                                   #  and removed 2026-08-07 — FR-027a deferred)
└── web/
    └── src/
        ├── components/ui/dialog.tsx                # NEW — shadcn (Base UI)
        ├── components/ui/dropdown-menu.tsx         # NEW — shadcn (Base UI)
        ├── components/ui/slider.tsx                # NEW — shadcn (Base UI)
        ├── lib/image.ts                            # NEW — decode/crop/encode helpers
        ├── lib/upload.ts                           # NEW — XHR PUT with progress
        ├── helpers/avatar-error-message.ts         # NEW — rejection copy mapping
        └── app/(protected)/(main)/profile/
            ├── page.tsx                            # avatar becomes the menu trigger
            ├── use-report-avatar-error.ts          # shared failure copy + 401 redirect
            ├── use-select-photo.ts                 # type/size/decode checks
            ├── use-upload-photo.ts                 # crop state + sign/transfer/commit
            ├── use-remove-photo.ts                 # removal mutation
            └── _components/
                ├── avatar-menu.tsx                 # avatar + menu shell
                ├── upload-photo-menu-item.tsx      # "Enviar imagem" + file input
                ├── remove-photo-menu-item.tsx      # "Remover imagem"
                └── avatar-crop-dialog.tsx          # cropper + zoom + progress + upload
```

*(The original plan put every flow in one `use-avatar-photo.ts` behind a single `avatar-menu.tsx`, with three server actions in `actions.ts`. Both were replaced on 2026-08-07 — see the Structure Decision below.)*

**Structure Decision**: Hooks are **route-scoped** — only the Profile route consumes them, and the constitution promotes any of them to `src/hooks/` the moment a second route imports it. One component owns one action: `upload-photo-menu-item.tsx` selects and validates, `avatar-crop-dialog.tsx` frames and uploads, `remove-photo-menu-item.tsx` removes. The mutual exclusion in FR-023c is no longer a shared flag but a read of the mutation cache (`useIsMutating`), which survives the menu item unmounting when the menu closes mid-request. `lib/upload.ts` is separate from `lib/image.ts` because XHR-with-progress is transport infrastructure while canvas work is image infrastructure; both are infrastructure, so both sit in `lib/` rather than `helpers/`, which is reserved for domain rules.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New npm dependency `react-easy-crop` (web) | Pan + zoom + round overlay + touch pinch + correct `croppedAreaPixels` math across arbitrary source aspect ratios. Explicitly requested as the crop abstraction. 6.2.3, MIT, peer `react >=16.4`, one transitive dep. | Hand-rolling pointer/pinch gesture math and crop-region projection is a large, defect-prone surface — FR-008 (frame must stay fully covered) is exactly what is easy to get subtly wrong by hand. |
| New npm dependencies `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (backend) | **Directed by the user.** The presigner is not optional once presigned uploads are the strategy — SigV4 query-param signing is not something to implement by hand. Also buys retries and vendor portability (same code targets S3/R2/MinIO by changing `endpoint`). | A hand-rolled `fetch` wrapper over Supabase's REST storage API was an earlier plan of record; it cannot produce presigned URLs at all, so it is no longer a candidate. |
| Three-step upload handshake instead of one request | Required by the presigned strategy: the client cannot be trusted to pick the object key, and the server must verify the bytes it did not see. | A single `PUT` carrying base64 through the API was the earlier plan — simpler and inherently validated, but it proxies every byte through the Node process and cannot report upload progress. Superseded by direction. |
| Post-upload verification (`HeadObject` + ranged `GetObject`) | The only way to keep FR-026 true when the API never sees the bytes. Costs two cheap storage calls on commit. | Trusting the client's declared size/type — a direct violation of the spec's explicit "Nunca confiar apenas na validação do frontend". Not an option. |

**Explicitly avoided**: `@fastify/multipart` (no multipart anywhere now), `@supabase/supabase-js` / `@supabase/storage-js` (redundant with the S3 route), `sharp` (no server-side resizing — the client sends a final 512×512), a scheduled orphan-cleanup job (the commit-time prefix sweep subsumes it), and Radix (`@base-ui/react` is already the project's primitive library, so all three shadcn components install with **zero** new packages).
