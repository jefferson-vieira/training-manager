# Phase 0 Research: Atualização da Foto de Perfil com Recorte

**Feature**: `011-profile-photo-crop` | **Date**: 2026-08-05

Every decision below was checked against the actual repository state or vendor documentation, not assumed. Findings that changed the design are called out explicitly.

---

## R-001 — Crop library

**Decision**: `react-easy-crop@6.2.3` (web workspace).

**Rationale**: The instruction was to abstract the crop behind a known library. `react-easy-crop` is the standard React choice for avatar cropping and supplies exactly the four things FR-006/007/008 require: drag-to-pan, zoom (wheel, pinch, programmatic), a `cropShape="round"` overlay, and `onCropComplete(croppedArea, croppedAreaPixels)` giving the source-pixel rectangle to draw. Constraining the image to always cover the frame — FR-008 — is the library's default behavior, and it is the single hardest piece to get right by hand.

Dependency cost is small: MIT, peer range `react >=16.4.0` (React 19 fine), exactly one transitive dependency (`normalize-wheel`). It renders with CSS transforms and has no primitive-library dependency, so it cannot conflict with `@base-ui/react`.

**Verified**: `npm view react-easy-crop` → `6.2.3`, `peerDependencies.react: ">=16.4.0"`, `dependencies: { normalize-wheel }`.

**Alternatives considered**:
- **`react-image-crop`** — leaner (zero deps), but built around a *user-resizable selection over a static image*, not a *fixed frame over a movable image*. Pan + zoom would have to be rebuilt on top, defeating the purpose.
- **`cropperjs`** — powerful but large and imperative; would need a hand-written React wrapper for a fixed 1:1 avatar frame.
- **Hand-rolled pointer events** — rejected in Complexity Tracking.

**Important detail**: `cropShape="round"` is *purely CSS* — the library confirms the overlay is `border-radius` only. `croppedAreaPixels` is always a rectangle, so the stored asset is a **square** image and the circular appearance comes from the existing `Avatar` component's rounding. Correct per FR-019; do not attempt transparent corners.

---

## R-002 — Menu, modal, and zoom primitives

**Decision**: shadcn `dropdown-menu`, `dialog`, and `slider`, added via the CLI. **Zero new npm packages.**

**Rationale**: This is the finding that most shaped the frontend plan. `packages/web/package.json` has **no Radix dependency** — it has `@base-ui/react@1.6.0`, and `components.json` declares `"style": "base-vega"`, the shadcn Base UI style. The existing vendored components confirm it: `tooltip.tsx`, `checkbox.tsx`, `scroll-area.tsx`, and even `drawer.tsx` all import from `@base-ui/react/*` (the drawer is Base UI's, not `vaul`).

So `npx shadcn@latest add dropdown-menu dialog slider` resolves to Base UI variants importing `@base-ui/react/menu`, `/dialog`, and `/slider` — all already installed.

The accessibility requirements come free from the primitives rather than from hand-written code:

| Requirement | Provided by |
|---|---|
| FR-001c — menu closes on `Esc`/outside click, arrow-key navigation, focus returns to trigger | Base UI Menu |
| FR-030 — dialog focus trap, `Esc` to close, focus restoration, `aria-modal` | Base UI Dialog |
| FR-030 — zoom operable by arrow keys | Base UI Slider |

**Caution for implementation**: querying the default `@shadcn` registry metadata reports `radix-ui` as the dependency, because that metadata describes the *default* style. The installed style governs. After running the add command, **verify the generated files import from `@base-ui/react`** and that `package.json` gained no `radix-ui` entry. If Radix does appear, stop — a second primitive library alongside Base UI violates Constitution V.

**Alternatives considered**:
- **Reuse the existing `drawer.tsx` for the crop modal** — attractive on mobile, but a drawer is the wrong affordance for a focused confirm/cancel editing task on desktop, and the app already uses the drawer for the global Coach IA overlay. Keeping them distinct avoids overloading one pattern.
- **Zoom with only `+`/`−` buttons, no slider** — would avoid one vendored file, but a slider is the expected affordance and is natively keyboard-operable. Ship both: slider for pointer/keyboard, `+`/`−` buttons meeting the 44×44px touch target for FR-031.

---

## R-003 — Upload transport: presigned direct-to-storage PUT

**Decision**: A three-step handshake. `POST /me/image/upload-url` returns a short-lived signed `PUT`; the browser sends the bytes straight to Supabase Storage; `PUT /me/image` commits the key after the server verifies the object.

**This supersedes the earlier decision** (a single `PUT /me/image` carrying base64 JSON through the API). Recorded honestly, because the earlier reasoning was sound and is now traded away deliberately:

**What the presigned strategy buys**
- **Image bytes never enter the Node process.** No body-limit tuning, no base64 inflation, no request memory proportional to upload size, and the API stays responsive regardless of client bandwidth.
- **Real upload progress.** `fetch()` cannot report request-body progress; `XMLHttpRequest.upload.onprogress` can. The spec's "exibir indicador de progresso durante uploads mais longos" goes from aspirational to actually implementable — this is the clearest user-visible win.
- Scales to larger assets later without redesign.

**What it costs**
- **Three round trips instead of one**, and more moving parts to fail independently.
- **The API no longer sees the bytes**, which is a direct problem for FR-026. Resolved in R-010 — and that resolution is mandatory, not optional.
- **Orphaned objects** become possible when a client uploads but never commits. Resolved in R-011.
- **Bucket CORS becomes a hard dependency.** A browser `PUT` to `*.storage.supabase.co` is a cross-origin request; without a CORS rule allowing the web origin and the `PUT` method, the upload fails in the browser with an opaque error while working fine from `curl`. This is the single most likely cause of "it works locally in Postman but not in the app."

**Client-side transport**: `XMLHttpRequest`, not `fetch`, purely for the progress events. Wrap it once in `lib/upload.ts` so the callback-shaped API is contained and the hook sees a promise.

**Not multipart, either**: with the bytes going direct to storage, `multipart/form-data` and `@fastify/multipart` are moot — no endpoint carries a file any more. The remaining request bodies are small JSON objects that `fastify-type-provider-zod` describes natively, so the Zod → OpenAPI → Orval chain stays mechanical, which was the original reason to avoid multipart.

**Alternatives considered**:
- **Base64 JSON through the API** — the previous plan of record; simpler and inherently validated, but proxies every byte through Node and cannot report progress. Superseded by direction.
- **Presigned POST with a policy document** — supports a signed `content-length-range`, which presigned PUT does not express as cleanly. Rejected because the AWS SDK's presigner targets PUT, the client would have to assemble a multipart form, and R-010's verification makes the size guarantee redundant anyway.

---

## R-004 — Where the browser calls the API from

**Decision**: Next.js **Server Actions** in `profile/actions.ts` — one for upload, one for removal — called from the client hook.

**Rationale**: A hard constraint discovered in the code, not a preference. `packages/web/src/lib/fetch.ts` builds every request with `(await cookies()).toString()` from `next/headers` — it is **server-only**. The Orval-generated client is therefore unusable from a client component, so the crop dialog cannot call the API directly while still obeying "API communication MUST use the Orval-generated client".

The project already has this exact pattern: `app/(protected)/(main)/workout-plans/[workoutPlanId]/days/[workoutDayId]/actions.ts` is a `'use server'` module whose actions call the generated client and then `revalidatePath(...)`, returning a plain `{ ok: boolean }`. The new actions follow it verbatim.

**Bonus**: `revalidatePath` on the `(protected)` layout segment is exactly what FR-015 and FR-023a ask for — every server-rendered surface showing the avatar re-renders, with no client cache to invalidate separately.

**Alternatives considered**:
- **Browser `fetch` straight to the backend with `credentials: 'include'`** — works (CORS and `trustedOrigins` are configured) but bypasses the generated client. Rejected on Constitution "Package Rules".
- **A second, browser-safe Orval mutator** — a real option, but introduces a parallel client and a second auth path for two endpoints. Not worth it while server actions cover it.

---

## R-005 — Storage client: AWS SDK over Supabase's S3 endpoint

**Decision**: `@aws-sdk/client-s3@3.1103.0` **and `@aws-sdk/s3-request-presigner@3.1103.0`** (backend), configured against Supabase Storage's S3-compatible endpoint.

**This reverses the previous plan of record.** The earlier revision specified a ~60-line `fetch` wrapper over Supabase's REST storage API with zero new dependencies. The user directed the AWS SDK instead, citing the Supabase S3 docs. Recording the trade honestly:

**What the SDK buys**
- **SigV4 request signing**, implemented and maintained upstream rather than by us.
- **Retries with exponential backoff** on transient 5xx/network failures — the REST wrapper had none, which matters because a failed upload surfaces to the user as a failed save (FR-016).
- **Vendor portability** — the same `PutObjectCommand`/`DeleteObjectCommand` code targets AWS S3, Cloudflare R2, or MinIO by changing `endpoint`. The REST wrapper was Supabase-shaped and would have to be rewritten to move.
- A typed, well-documented command surface instead of hand-parsed HTTP responses.

**What it costs**
- A large transitive tree. `@aws-sdk/client-s3` pulls dozens of `@aws-sdk/*` and `@smithy/*` packages. This is a **backend** dependency, so there is no browser bundle impact — the cost is `node_modules` size and install time, not user-facing performance. That containment is what makes the trade defensible under Constitution V.
- Configuration is easier to get subtly wrong than three `fetch` calls (see the gotchas below).

**Verified from the Supabase S3 authentication docs**:

```ts
const client = new S3Client({
  forcePathStyle: true,
  region: 'project_region',
  endpoint: 'https://project_ref.storage.supabase.co/storage/v1/s3',
  credentials: { accessKeyId, secretAccessKey },
});
```

**Gotchas that will bite if missed**:
1. **`forcePathStyle: true` is mandatory.** The SDK defaults to virtual-hosted-style (`bucket.host/key`); Supabase requires path-style (`host/bucket/key`). Omitting it produces confusing DNS or 404 errors.
2. **The endpoint host is `project_ref.storage.supabase.co`**, not the regular `project_ref.supabase.co` API host. The docs call this out as the higher-performance path for uploads.
3. **`region` must match the project's actual region** — SigV4 signs over it, so a mismatch fails signature verification rather than being ignored.
4. **S3 access keys are distinct from the service-role key.** They come from the dashboard's S3 configuration page, and per the docs they "provide full access to all S3 operations across all buckets and bypass RLS policies" — server-only, never sent to the browser, and worth treating as the most sensitive secret this feature adds.
5. **Local development needs different `region`/`endpoint` values** than production.

6. **The presigner is a separate package.** `getSignedUrl` comes from `@aws-sdk/s3-request-presigner`, not from `@aws-sdk/client-s3`. Both must be installed.

**Operations used** — all confirmed supported by Supabase's S3 compatibility documentation:

| Operation | Used for |
|---|---|
| `PutObject` (presigned) | The browser's direct upload |
| `HeadObject` | Verifying real object size on commit (R-010) |
| `GetObject` with `Range` | Reading the first 12 bytes for the magic-byte check (R-010) |
| `DeleteObject` | Replacement cleanup, removal, and rejecting a bad upload |
| `ListObjectsV2` | The commit-time orphan sweep (R-011) |

**Not used**: the `Upload` class for multipart. Multipart exists for large files; a ≤2 MB avatar is a single `PutObject`.

**Worth knowing**: Supabase Storage does **not** support S3 versioning — "deleted objects are permanently removed and cannot be restored." Every delete in this feature is therefore final, which is consistent with the spec's exclusion of photo history, but means a bug in the ownership check (R-006) destroys data irrecoverably rather than merely inconveniently.

**Alternatives considered**:
- **Hand-rolled `fetch` over the Supabase REST storage API** — an earlier decision; lighter but unsigned, retry-less, vendor-locked, and incapable of producing presigned URLs. No longer a candidate.
- **`@supabase/storage-js`** — drags `iceberg-js`; redundant with the S3 route.

---

## R-006 — Object naming, and deleting the photo we replace or remove

**Decision**: Store at `avatars/{userId}/{crypto.randomUUID()}.webp`, with the key **generated server-side and never accepted from the client**. On removal, delete the object only when the outgoing `user.image` URL is one of ours. On replacement, cleanup is handled by the prefix sweep in R-011 rather than by a targeted delete.

**Rationale**: Two constraints pull against each other. FR-022 wants the old object gone; the spec's assumption "stored object names are not guessable from user data" wants no raw identifiers in the path.

A random filename under a per-user prefix satisfies both: the *directory* is the user id (already an opaque id, and the bucket lists nothing publicly), while the *object name* carries the entropy, so avatars cannot be enumerated. It also sidesteps CDN staleness for free — every save produces a brand-new URL, so a cached copy of the old one can never be served in its place.

**FR-023/FR-023b is the subtle one**, and it now applies on **two** paths — replacement *and* removal. A Google user's `user.image` is a `googleusercontent.com` URL we do not own. Both paths must gate deletion on the outgoing URL starting with our bucket's public prefix. Getting it wrong means firing a delete at a foreign URL on the first upload of every OAuth user, and again if they remove it.

Extract the ownership check into a single helper used by both use-cases, so the rule cannot drift between them.

**The `{userId}` segment is load-bearing, not cosmetic.** Under the presigned strategy it does double duty: it scopes the orphan sweep (R-011), and it is what lets the commit endpoint reject a key belonging to someone else (V-10). A flat `avatars/{uuid}.webp` layout would make both impossible.

**Ordering (replacement)**: verify → update `user.image` → sweep the prefix, best-effort. If cleanup fails, log and move on; FR-022 explicitly forbids failing the request over it. The reverse order risks a profile pointing at an object that no longer exists.

**Ordering (removal)**: clear `user.image` → delete object, best-effort. Same reasoning — the user-visible state is correct even if cleanup lags. Removal keeps the *targeted* delete rather than a sweep, because there is no surviving object to exclude and the ownership check is the only thing standing between a Google user and a delete call against a URL we do not own.

---

## R-007 — High-resolution sources without freezing the UI

**Decision**: `createImageBitmap(file)` to decode, `OffscreenCanvas` to draw and encode when available, with a `document.createElement('canvas')` fallback. Output `image/webp` at quality `0.82`, capped at 512×512.

**Rationale**: SC-002 requires a 20 MP source to stay smooth. The expensive steps are decode and encode, and `new Image()` + `img.src = objectUrl` decodes on the main thread — the direct cause of the jank this criterion is written against. `createImageBitmap` decodes off-thread and returns a bitmap ready to draw; it doubles as the **decodability check** FR-025 needs, since it throws on a corrupt file.

The react-easy-crop docs' reference `getCroppedImg` helper uses `new Image()` and returns an object URL of a JPEG. Do not copy it verbatim: swap the decode path, and return the **`Blob`** rather than an object URL, since the blob is what gets encoded and sent — one fewer object URL to revoke.

WEBP over JPEG for a smaller file at equal quality, with no transparency concern (the crop is always fully covered). `canvas.toBlob('image/webp')` is supported across the targeted range; Safari has encoded WEBP since 14.

**Object URL lifecycle (FR-017)**: exactly one object URL exists at a time — the one feeding the cropper's `image` prop. Revoke it in the hook's cleanup on dialog close, on successful upload, and on unmount. The output `Blob` is handed straight to the XHR body as binary and dropped once the transfer resolves; it is never base64-encoded and never becomes an object URL.

---

## R-008 — Session freshness after the change

**Decision**: Nothing extra required. Update `user.image` through Prisma in the use-cases.

**Rationale**: Worth checking rather than assuming, because a stale session cache would silently break FR-015. `packages/backend/src/lib/auth.ts` configures `session: { expiresIn }` and **does not enable `cookieCache`**, so better-auth resolves the session from the database on every `getSession()` call. A Prisma write to `user.image` is visible on the very next request with no session refresh or sign-out dance.

`GET /me` (`GetUserWithProfile`) already returns `image`, and `UserSchema` already declares it `z.string().nullable()` — the read contract needs **no change**, and the `null` case that removal produces is already modelled. Only the two write endpoints are added.

---

## R-009 — Mutual exclusion between upload and removal

**Decision**: One route-scoped hook (`use-avatar-photo.ts`) owns a single `status` value covering both actions.

**Rationale**: FR-013 forbids concurrent uploads and FR-023c forbids a removal racing an upload. Modelling these as two independent booleans (`isUploading`, `isRemoving`) invites the state where both are true, or where each guard checks only its own flag — the classic version of this bug. A single discriminated status (`idle | selecting | cropping | uploading | removing`) makes the illegal states unrepresentable: every action guards on `status !== 'idle'` and the menu items derive their disabled state from the same value.

This is also why removal lives in the same hook rather than its own — two hooks would mean two states with no shared source of truth. The presigned flow reinforces it: `uploading` now spans three sequential network steps (sign → transfer → commit), so a boolean flipped by whichever step finished last would be even easier to get wrong.

---

## R-010 — Keeping "never trust the frontend" true without seeing the bytes

**Decision**: `PUT /me/image` verifies the uploaded object **before** committing it. Verification is `HeadObject` for the true `ContentLength`, plus `GetObject` with `Range: bytes=0-11` for the magic bytes. A failing object is deleted and the request is rejected.

**Rationale**: This is the load-bearing decision of the presigned design, and skipping it would quietly gut an explicit requirement. The spec is unambiguous — FR-026 says the server must independently validate type and size and "MUST NOT trust any client-side validation", and the original brief states "Nunca confiar apenas na validação do frontend."

A presigned URL is a **write capability handed to the client**. Whatever the browser was *supposed* to send, what actually lands in the bucket is entirely the client's choice: a 4 GB file, an HTML document, a polyglot image, anything. Signing `ContentType`/`ContentLength` into the URL helps, but a signed header is a constraint on a *well-behaved* request, and treating it as a security boundary is exactly the "trust the client" mistake the requirement forbids.

The fix is to move validation from *before storage* to *before commit*. The invariant that matters is not "no bad bytes ever reach the bucket" — it is **"no bad bytes are ever referenced by a user profile."** An unverified object is inert: it lives under a random key nobody can guess, is referenced by nothing, and is deleted on the spot when it fails.

**Verification steps, in order (cheapest first, and each gates the next)**

1. **Key ownership** — the key must match `avatars/{session.user.id}/…`. A client that submits someone else's key is rejected before any storage call. This is the check that prevents pointing your profile at another user's object.
2. **`HeadObject`** — object must exist (a client can commit a key it never uploaded) and `ContentLength` must be ≤ `AVATAR_MAX_BYTES`. This is the real size, not a claim.
3. **Ranged `GetObject` for 12 bytes** — magic bytes must match JPEG, PNG, or WEBP. Twelve bytes is enough for all three signatures and costs essentially nothing.
4. Only now: update `user.image`.

**Why a ranged GET rather than downloading the object**: the whole point of the presigned strategy is that the API does not move image bytes. Pulling the full object back to validate it would surrender that benefit entirely. Twelve bytes preserves it.

**On failure**: delete the offending object, then return `400`. Leaving it costs storage and leaves an attacker-controlled file sitting in a public bucket — small, but free to avoid.

**Residual gap, stated plainly**: magic bytes prove the file *starts* like an image, not that it is a well-formed or safe image. Because the bucket serves these as `image/webp` to `<img>` tags and never executes them, and because the client generated the file via canvas in the normal path, this is proportionate. Full decode-side validation would need `sharp` on the server — a heavy dependency this feature does not otherwise want.

**Alternatives considered**:
- **Trust the signed `ContentType`/`ContentLength`** — rejected above; it is client trust with extra steps.
- **A storage webhook that validates asynchronously after upload** — validates *after* the commit could already have happened, leaving a window where a profile points at unverified content. Worse, and more infrastructure.
- **Download and fully decode the object** — surrenders the strategy's main benefit for a marginal gain.

---

## R-011 — Orphaned objects, and a sweep instead of a cron

**Decision**: After a successful commit, `ListObjectsV2` on `avatars/{userId}/` and delete every object except the one just committed.

**Rationale**: The presigned flow introduces a failure mode the previous design did not have: the browser can upload successfully and then never call commit — the tab closes, the network drops, the user walks away. The object is already in the bucket, referenced by nothing, and no code path would ever revisit it.

A per-user prefix sweep on commit handles this without new infrastructure, and it collapses three concerns into one operation:

- **FR-022** — the replaced photo is deleted (it is simply one of the "not current" objects).
- **Orphan cleanup** — abandoned uploads are collected on the user's next successful save.
- **SC-011** — "after ten replacements the bucket holds exactly one object for that user" becomes structurally true rather than merely intended, because the sweep enforces the invariant instead of assuming each individual delete succeeded.

It also self-heals: a delete that failed on an earlier request is retried implicitly on the next one.

**Ordering**: commit `user.image` **first**, sweep after, wrapped in `try/catch` that logs and continues. FR-022 forbids failing the user's request over cleanup, and sweeping before committing would risk deleting the object we are about to reference.

**Guard**: the sweep must exclude the just-committed key explicitly rather than relying on ordering or timestamps. Deleting the current avatar because of an off-by-one in that filter is the worst failure this feature can produce, and Supabase Storage has no versioning to recover from it (R-005).

**Known limitation — concurrent saves (accepted risk, spec Clarifications)**: the sweep computes its "keep" key from the commit that is running. If two clients commit at nearly the same time, the earlier commit's sweep can execute *after* the later commit and delete the object the profile now names. The spec deliberately accepts this rather than adding versioning or locking. Two consequences worth knowing while implementing:

- Do **not** design around it with retries or ordering tricks — it was weighed and accepted; adding partial mitigation would create the illusion of safety without the guarantee.
- The degradation is soft: `Avatar.Fallback` renders on a failed image load, so the user sees initials rather than a broken image, and recovers by saving again.

Re-reading the profile's current photo inside the commit (rather than trusting the value read moments earlier) narrows the window at zero cost and is worth doing — but it does not close it, and must not be described as if it does.

**Known limitation**: a user who abandons an upload and never uploads again keeps one orphan indefinitely. That is bounded (one object per user, ≤2 MB) and acceptable. If it ever matters, a bucket lifecycle rule on the prefix is the answer — not application code.

**Alternatives considered**:
- **A scheduled cleanup job** — real infrastructure, real failure modes, and a whole operational surface for a problem measured in kilobytes.
- **Deleting only the specific previous URL** (the earlier plan) — correct for replacement, but blind to orphans, and it silently drifts if any single delete ever fails.
- **Uploading to a `pending/` prefix and copying on commit** — clean separation, but a server-side copy moves bytes again, which is what this strategy exists to avoid.

---

## R-012 — Bucket CORS

**Decision**: The bucket needs a CORS rule allowing the web origin with the `PUT` method. Configuration, not code — documented in `quickstart.md` §1.1.

**Rationale**: Flagged separately because it is the failure everyone hits once and nobody predicts. The browser now issues a cross-origin `PUT` to `https://{ref}.storage.supabase.co`, preceded by an `OPTIONS` preflight because the request carries `Content-Type`. Without a matching CORS configuration the preflight fails and the browser reports a generic network/CORS error with no useful body — while the exact same presigned URL works perfectly from `curl`, because `curl` does not enforce CORS. That asymmetry is what makes it cost an afternoon.

Required: allowed origin = the web origin (`CLIENT_ORIGIN`, e.g. `http://localhost:3000` in dev), allowed methods include `PUT`, allowed headers include `Content-Type`.

Supabase's S3 compatibility documentation does not cover CORS configuration, so this is set on the storage/bucket settings rather than through the S3 API.


---

## R-013 — Per-user rate limit on the upload-URL endpoint

> **Superseded 2026-08-07 — deferred, not implemented.** The limiter below was built, then removed along with `lib/avatar-upload-rate-limit.ts` and the `AVATAR_UPLOAD_RATE_LIMIT_*` env vars. The reasoning for *why* the bound belongs on the sign step still holds and is kept here for whoever implements it; what changed is the storage: a per-process `Map` resets on every restart and is bypassed entirely by a second instance, so it read as a bound without being one. Reintroduce it on a shared store (Redis) — the `// ToDo move to redis instance` note in `lib/password-reset-rate-limit.ts` is the same open item. Until then `POST /me/image/upload-url` is unbounded for an authenticated user.

**Decision**: A small in-memory, env-configured limiter in `packages/backend/src/lib/avatar-upload-rate-limit.ts`, keyed by user id, applied to `POST /me/image/upload-url` only. ~10 requests per 5-minute window (`AVATAR_UPLOAD_RATE_LIMIT_MAX` / `AVATAR_UPLOAD_RATE_LIMIT_WINDOW`).

**Rationale**: FR-027a. The presigned design means each call to this endpoint hands the client a capability to write into a public bucket — nothing else in the flow bounds how many objects one authenticated session can create. Commit-time validation does not help: an attacker who never commits still fills the bucket, and the orphan sweep (R-011) only runs on a *successful* commit, so uploads that are never committed are exactly the ones cleanup does not reach.

The limit belongs on the sign step rather than the commit step for the same reason — commit merely references an object that already exists.

**Two things that are easy to get wrong**:
1. **better-auth's `rateLimit` does not cover this.** It is configured in `lib/auth.ts` with `customRules` for better-auth's *own* routes (`SignInEmail`, `RequestPasswordReset`). Application routes registered under `/me` never pass through it. This needs its own implementation.
2. **Key by user id, not IP.** The endpoint is authenticated, and per-user is what actually bounds bucket growth; per-IP would both over-block shared networks and under-block a single user on mobile.

**Precedent to follow, not reinvent**: `packages/backend/src/lib/password-reset-rate-limit.ts` already implements this shape in this repo — in-memory counter, env-configured max and window, a `consume…Attempt()` returning `{ allowed }`. Mirror it. Its in-memory nature carries the same known limitation: the counter is per-process and resets on restart, which is acceptable here for the same reasons it was there.

**Alternatives considered**:
- **Reuse better-auth's limiter** — not reachable from application routes, as above.
- **A hard cap on objects per user prefix, checked at sign time** — bounds total storage rather than request rate, but costs a `ListObjectsV2` on every sign and punishes a legitimate user whose sweep failed earlier. The rate limit is the cheaper control.
- **No limit** — leaves an authenticated session able to write to the bucket without bound.

---

## R-014 — The provider must not repopulate a removed photo

**Decision**: No new mechanism. Confirm the Google provider in `packages/backend/src/lib/auth.ts` is not configured to overwrite user info on sign-in, and keep it that way.

**Rationale**: FR-023f. Removal sets `user.image` to `null` — precisely the state a provider sync reads as "empty, fill it". If Google sign-in repopulates it, the user's removal silently undoes itself on their next sign-in, and no second removal would make it stick.

**The current configuration is already correct**: `socialProviders.google` in `lib/auth.ts` sets only `clientId`, `clientSecret`, and `prompt`. better-auth does not overwrite existing user fields on subsequent sign-ins unless explicitly told to, so the default behavior satisfies FR-023f today.

**Why this still deserves an entry**: it is a requirement satisfied by the *absence* of configuration. Nothing fails, so nothing prompts anyone to check it, and a future change made for an unrelated reason — enabling provider info sync to keep names or emails fresh — would regress it silently and invisibly. The task is to add the manual verification step (quickstart S40a) and, if provider sync is ever enabled, to exclude `image` explicitly.

**Alternatives considered**:
- **A dedicated "photo removed" flag** so sync can distinguish "never had one" from "removed one" — the correct design *if* provider sync were ever enabled. Unnecessary while it is off, and a column added for a hypothetical is exactly the drift the data model avoids elsewhere.
