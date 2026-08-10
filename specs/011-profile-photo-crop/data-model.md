# Phase 1 Data Model: Atualização da Foto de Perfil com Recorte

**Feature**: `011-profile-photo-crop` | **Date**: 2026-08-05

## Summary

**No Prisma migration is required.** The `User.image` column already exists (`packages/backend/prisma/schema.prisma`, `image String?`) and already carries the identity provider's picture URL. This feature changes *who writes it* and *what it points at*, not the schema.

That is a deliberate outcome, not a coincidence: RN-01 ("one active photo per user") is enforced structurally by a single nullable column — there is no second row that could represent a second active photo, and no state to reconcile. The column being **nullable** is also what makes removal (FR-023a) a schema no-op.

---

## Persisted entities

### `User.image` (existing column, no change)

| Aspect | Value |
|--------|-------|
| Prisma field | `image String?` |
| DB column | `image` |
| Meaning before | Public URL of the Google account picture, or `NULL` |
| Meaning after | Public URL of the Google account picture, **or** the public URL of an object in our avatars bucket, or `NULL` (never set, or removed) |
| Cardinality | Exactly one per user — enforced by the column itself (RN-01) |

**Origin is derived, not stored.** The spec's Profile Photo entity lists an *origin* attribute (uploaded by us vs. inherited from the provider), and FR-023 / FR-023b depend on it. It is deliberately **not** a new column: the URL prefix already answers the question.

```
image starts with `{public bucket prefix}`  → ours, safe to delete
anything else (googleusercontent.com, …)     → not ours, never delete
image is NULL                                → nothing to delete
```

Adding an `image_origin` enum column would introduce a second source of truth that could drift from the URL it describes. The prefix check cannot drift.

**A URL that no longer resolves degrades safely.** `Avatar.Fallback` renders whenever the image fails to load, so a dangling `user.image` — from the accepted concurrent-save race (research R-011) or an out-of-band bucket edit — shows the user's initials rather than a broken image. No explicit handling is needed for this case; it is a property of the existing component, and worth not accidentally engineering around.

**Implementation note**: this check is used by both `UpdateUserImage` and `RemoveUserImage`. Extract it once (e.g. `isOwnedAvatarUrl(url)` in `lib/storage.ts`) so the two paths cannot diverge. Supabase Storage has no versioning — a wrong answer here deletes data permanently (research R-005).

### Storage object (external, not in Postgres)

| Aspect | Value |
|--------|-------|
| Location | Supabase Storage bucket `{SUPABASE_S3_BUCKET}`, public read, written over the S3 protocol |
| Key | `avatars/{userId}/{crypto.randomUUID()}.webp` — **generated server-side, never accepted from the client** |
| Content type | `image/webp` |
| Dimensions | Square, at most 512×512 |
| Lifecycle | Written directly by the browser via presigned PUT; referenced only after server verification; swept when superseded |

The random object name keeps avatars non-enumerable while the per-user prefix keeps cleanup and the ownership check tractable. It also guarantees a new URL on every save, so a CDN can never serve a stale previous photo under a reused key.

**The `{userId}` segment is load-bearing, not cosmetic.** It is what lets the commit endpoint reject a key belonging to another user (V-10) and what scopes the orphan sweep (research R-011).

**Two different hosts** — conflating them yields an unreachable avatar URL:

| Purpose | URL |
|---|---|
| Writes (presigned PUT, HEAD, GET, DELETE, LIST) | `https://{ref}.storage.supabase.co/storage/v1/s3` |
| Public read — what goes in `user.image` | `{SUPABASE_URL}/storage/v1/object/public/{bucket}/{key}` |

---

## Transient state

### Client-side

None of this is persisted; it exists only while the dialog is open, and its disposal is a requirement in its own right (FR-017, SC-010).

| State | Type | Created | Destroyed |
|-------|------|---------|-----------|
| `file` | `File` | On file-picker selection | On dialog close / after commit |
| `imageUrl` | object URL `string` | `URL.createObjectURL(file)` — feeds the cropper | `URL.revokeObjectURL` on close, on success, and on unmount |
| `crop` | `{ x, y }` | Cropper interaction | With the dialog |
| `zoom` | `number` (1 → 3) | Cropper interaction | With the dialog |
| `croppedAreaPixels` | `{ x, y, width, height }` | `onCropComplete` | With the dialog |
| cropped output | `Blob` | On confirm | After the transfer step resolves — sent as the XHR body verbatim, never base64-encoded |
| `uploadUrl` / `key` | `string` | From the sign step | After commit; the URL expires on its own regardless |
| `progress` | `number` (0–100) | `xhr.upload.onprogress` | With the dialog |

**Invariant**: at most one object URL is live at any moment. Selecting a new file while the dialog is open must revoke the previous URL before creating the next one.

### Server-side

**None.** The presigned URL is stateless — it carries its own expiry and signature, so no pending-upload table, no session storage, nothing to clean up. A key is validated on commit by its *shape* (V-10) and by the object's *existence* (V-11), not by a record of having issued it.

This is a deliberate simplification: tracking issued URLs would add a table, a cleanup path, and a failure mode, and would buy nothing the ownership-prefix check does not already provide.

---

## Upload flow — three steps

```
  browser                        API                        storage
     │                            │                            │
     │  ① POST /me/image/upload-url                            │
     │      { contentLength }     │                            │
     │───────────────────────────▶│                            │
     │                            │ generate key               │
     │                            │ avatars/{userId}/{uuid}    │
     │                            │ sign PUT (60s TTL)         │
     │◀───────────────────────────│                            │
     │   { uploadUrl, key }       │                            │
     │                            │                            │
     │  ② PUT <uploadUrl>  (XHR — bytes never touch the API)   │
     │────────────────────────────┼───────────────────────────▶│
     │            onprogress ──▶ UI                            │
     │                            │                            │
     │  ③ PUT /me/image { key }   │                            │
     │───────────────────────────▶│  V-10 key prefix           │
     │                            │  V-11 HeadObject ─────────▶│
     │                            │  V-12 GetObject Range 0-11▶│
     │                            │  commit user.image         │
     │                            │  sweep prefix ────────────▶│
     │◀───────────────────────────│                            │
     │   { image }                │                            │
```

Step ② is the only one carrying image bytes, and it does not involve the API. Steps ① and ③ are small JSON exchanges.

**If ② succeeds but ③ never happens**, the object is orphaned — inert, unreferenced, unguessable — and is collected by the sweep on the user's next successful save (research R-011).

**If ③ fails verification**, the object is deleted and `400` is returned; `user.image` is untouched.

---

## Flow state machine

A **single** `status` value in `use-avatar-photo.ts` drives every UI state the spec names, for both actions. Modelling upload and removal as separate booleans would permit the illegal "both in flight" state that FR-013 and FR-023c exist to prevent (research R-009).

```
                                    ┌──────┐
              ┌────────────────────▶│ idle │◀───────────────────┐
              │                     └──────┘                    │
              │                    │       │                    │
              │        "Enviar imagem"   "Remover imagem"       │
              │                    │       │   (only when a     │
              │                    ▼       │    photo exists)   │
              │             ┌───────────┐  │                    │
              │             │ selecting │  └──────┐             │
              │             └───────────┘         ▼             │
              │              │         │     ┌──────────┐       │
     dismissed / rejected ───┘         │     │ removing │───────┤
              │                  file chosen └──────────┘   success
              │                        │        │               │
              │                        ▼      failure ──────────┤
              │                 ┌──────────┐    │          (toast, photo
              │                 │ cropping │    └──────────▶ unchanged)
              │                 └──────────┘
              │                  │        │
              │        cancel / Esc    confirm
              │                  │        │
              └──────────────────┘        ▼
                                   ┌───────────────────────────┐
                                   │        uploading          │
                                   │  ① sign → ② transfer →    │
                                   │  ③ commit                 │
                                   │  (progress % from ②)      │
                                   └───────────────────────────┘
                                    │                        │
                              success                   failure at any step
                                    │                        │
                                    ▼                        ▼
                                 (idle)            (back to cropping,
                                                    crop preserved)
```

**Rules the diagram encodes**

- `uploading` is **one status across all three network steps**, not three. The user sees one operation; a per-step status would leak plumbing into the UI and multiply the guards that FR-013 depends on.
- Every entry transition guards on `status === 'idle'`, so an upload cannot start during a removal and vice versa (FR-013, FR-023c) — one condition, not two flags.
- `uploading` and `removing` are one-way while in flight: confirm is disabled, menu items are disabled, and `Esc`/overlay dismissal is suppressed so the dialog cannot vanish mid-request.
- Failure at **any** of the three steps returns to `cropping` with crop state intact — FR-016 requires retrying without reselecting and reframing. Retry restarts from step ① with a fresh signed URL, since the previous one may have expired.
- Removal failure returns to `idle` with the photo untouched (FR-023d); there is no framing state worth preserving.
- A rejected file never reaches `cropping`: `selecting → idle` with a toast (FR-024, FR-025).
- Success on either path clears every transient value listed above.

### Progress reporting

`progress` is meaningful only during step ②. Steps ① and ③ are sub-second JSON calls. Render an indeterminate indicator while `progress` is `0` or `100`-but-not-yet-committed, and a determinate bar in between — otherwise a fast upload shows a bar that jumps to 100% and then appears frozen during commit.

### Menu item availability

| Item | Enabled when |
|------|--------------|
| Enviar imagem | `status === 'idle'` |
| Remover imagem | `status === 'idle'` **and** the user has a photo (FR-001b — disabled, not hidden) |

---

## Validation rules

| # | Rule | Where | Source |
|---|------|-------|--------|
| V-1 | Extension in {`.jpg`, `.jpeg`, `.png`, `.webp`} | Client, on selection | FR-003, FR-024 |
| V-2 | `file.type` in {`image/jpeg`, `image/png`, `image/webp`} | Client, on selection | FR-024 |
| V-3 | `file.size` ≤ `MAX_SOURCE_BYTES` (5 MB) | Client, on selection | FR-028 |
| V-4 | `createImageBitmap(file)` resolves | Client, before opening the dialog | FR-025 |
| ~~V-4a~~ | ~~Per-user rate limit not exceeded (~10 / 5 min)~~ — deferred, not enforced (FR-027a) | — | — |
| V-5 | `contentLength` ≤ `AVATAR_MAX_BYTES` | Server, sign step ① | FR-028 |
| V-6 | Object key is generated server-side | Server, sign step ① — structural | FR-027 |
| V-7 | Signed URL expires in 60s | Server, sign step ① | Least privilege |
| V-8 | Request carries a valid session | Server, **all three** endpoints | FR-027 |
| V-9 | Target user is the session user | Server — id from session, never from body or path | FR-027 |
| **V-10** | Submitted key matches `avatars/{session.user.id}/…` | Server, commit step ③ | FR-027 |
| **V-11** | `HeadObject` succeeds and `ContentLength` ≤ `AVATAR_MAX_BYTES` | Server, commit step ③ | FR-026, FR-028 |
| **V-12** | First 12 bytes match JPEG / PNG / WEBP | Server, commit step ③ | FR-026 |

V-9 is structural rather than a check: every route derives `userId` from `session.user.id`, no request body has a user field, and there is no `:userId` path parameter — nothing to forge.

**V-4a runs before signing, not after.** A refused request must issue no `uploadUrl` at all; checking the limit after minting one would defeat the purpose.

**V-10 through V-12 are the presigned strategy's security boundary** (research R-010). V-5 at sign time is a courtesy check on a client-supplied number; V-11 at commit time is the real one, because it reads the object's actual size. Never treat V-5 as sufficient.

Magic-byte signatures for V-12:

| Format | Bytes |
|--------|-------|
| JPEG | `FF D8 FF` at offset 0 |
| PNG | `89 50 4E 47 0D 0A 1A 0A` at offset 0 |
| WEBP | `52 49 46 46` at offset 0 **and** `57 45 42 50` at offset 8 |

Twelve bytes covers all three — hence `Range: bytes=0-11`.

Order matters: V-10 (free) → V-11 (one storage call) → V-12 (one storage call). Never call storage before the key's ownership is established.

Removal carries no payload, so only V-8 and V-9 apply to it.
