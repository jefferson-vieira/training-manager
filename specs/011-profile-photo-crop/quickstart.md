# Quickstart & Manual Verification: Atualização da Foto de Perfil com Recorte

**Feature**: `011-profile-photo-crop` | **Date**: 2026-08-05

Constitution Principle I forbids automated tests. This document **is** the verification procedure — every acceptance scenario and success criterion in [spec.md](./spec.md) is exercised by hand below. A step is done when its **Expected** column is observed, not when the code compiles.

---

## 1. One-time setup

### 1.1 Supabase Storage bucket, S3 access, and CORS

Through the Supabase dashboard — none of this is done in code:

**Bucket** (Storage → New bucket)
- **Name**: matches `SUPABASE_S3_BUCKET` (suggested: `avatars`)
- **Public**: **yes** (reads are public URLs; see the spec's assumption on public profile pictures)
- **Allowed MIME types**: `image/webp`
- **File size limit**: match `AVATAR_MAX_BYTES`

**S3 protocol** (Settings → Storage → S3 access keys)
- Enable the S3 protocol for the project.
- Create an access key pair. These are **not** the service-role key, and per Supabase's docs they grant full access to all buckets and bypass RLS — server-only, treated as this feature's most sensitive secret.
- Note the project **region**; SigV4 signs over it, so a wrong value fails signature verification rather than being ignored.

**CORS** — *do not skip this.* The browser now `PUT`s directly to storage, so the bucket must allow it:

| Setting | Value |
|---|---|
| Allowed origins | `http://localhost:3000` (dev), plus the production web origin |
| Allowed methods | `PUT` |
| Allowed headers | `Content-Type` |

Without it, the preflight fails and the upload dies in the browser with an opaque CORS error — while the very same presigned URL works from `curl`, because `curl` does not enforce CORS. That asymmetry is the single most misleading failure in this feature (research R-012).

### 1.2 Backend environment

Add to `packages/backend/.env` (and document in `.env.example`, in Portuguese to match the file's style):

```bash
# Endpoint S3 do Supabase Storage. Use o host *.storage.supabase.co
# (não o host padrão da API) — é o caminho recomendado para uploads.
SUPABASE_S3_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3
# Região do projeto. A assinatura SigV4 inclui este valor; se divergir, o
# storage recusa a requisição por falha de assinatura.
SUPABASE_S3_REGION=
# Chaves do protocolo S3 (Settings → Storage). Não são a service role key.
# Dão acesso total a todos os buckets e ignoram RLS: uso exclusivo do backend.
SUPABASE_S3_ACCESS_KEY_ID=
SUPABASE_S3_SECRET_ACCESS_KEY=
# Bucket público onde as fotos de perfil recortadas são armazenadas.
SUPABASE_S3_BUCKET=avatars
# Host público de leitura, usado para montar a URL salva em user.image.
SUPABASE_URL=https://<project-ref>.supabase.co
# Tamanho máximo, em bytes, da imagem recortada aceita no commit.
AVATAR_MAX_BYTES=2097152
```

### 1.3 Dependencies and components

```bash
# repo root
npm install

# crop library
npm install react-easy-crop --workspace packages/web

# storage: client + presigner (the presigner is a separate package)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --workspace packages/backend

# menu, modal, zoom (Base UI variants, style base-vega)
cd packages/web && npx shadcn@latest add dropdown-menu dialog slider
```

**Verify immediately after the shadcn command** (research R-002):

```bash
head -5 packages/web/src/components/ui/dropdown-menu.tsx   # must import @base-ui/react/menu
head -5 packages/web/src/components/ui/dialog.tsx          # must import @base-ui/react/dialog
head -5 packages/web/src/components/ui/slider.tsx          # must import @base-ui/react/slider
git diff packages/web/package.json                         # must NOT add radix-ui
```

If `radix-ui` appears, stop — a second primitive library alongside Base UI violates Constitution V.

### 1.4 Run

```bash
docker compose up -d                        # Postgres
cd packages/backend && npm run dev          # :3333, docs at /docs
cd packages/web     && npm run dev          # :3000
```

After the three routes exist, regenerate the client:

```bash
cd packages/web && npx orval
```

### 1.5 Test images

| File | How to make it | Used by |
|------|----------------|---------|
| `portrait.jpg` | Any tall phone photo | S3, S6 |
| `wide.png` | A wide/panorama screenshot | S7 |
| `huge.jpg` | ≥ 20 MP (e.g. 5500×4000) | S8, SC-002 |
| `big.jpg` | > 5 MB | S18 |
| `fake.jpg` | `cp something.pdf fake.jpg` | S17 |
| `broken.jpg` | `head -c 2000 portrait.jpg > broken.jpg` | S19 |
| `photo.webp` | Any WEBP | S4 |

---

## 2. Verification script

Sign in and go to `http://localhost:3000/profile` before starting.

**API paths for the `curl` sections**: routes are served under `/api`, e.g. `POST http://localhost:3333/api/me/image/upload-url`. Obtain a session cookie with:

```bash
curl -s -c cookies.txt -X POST http://localhost:3333/api/auth/sign-in/email \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  -d '{"email":"<user>","password":"<pass>"}'
```

### Menu — FR-001, FR-001a/b/c

| # | Step | Expected |
|---|------|----------|
| S1 | Click the avatar | A dropdown opens with **Enviar imagem** and **Remover imagem** — the picker does **not** open directly |
| S2 | With a photo set, inspect the menu | Both items enabled |
| S3 | As a user with no photo, open the menu | "Remover imagem" is present but **disabled** — not hidden (FR-001b) |
| S4 | Press `Esc`; reopen and click outside | Menu closes both ways; focus returns to the avatar trigger |
| S5 | Open with keyboard, navigate with `↑`/`↓` | Items reachable and activatable by keyboard (FR-001c) |

### Happy path — User Story 1 (P1) — FR-002, FR-005, FR-007, FR-009, FR-011, FR-012, FR-014, FR-018, FR-020, FR-021, SC-005

| # | Step | Expected |
|---|------|----------|
| S6 | Choose **Enviar imagem** | Native file picker opens, filtered to images |
| S7 | Choose `portrait.jpg` | Crop dialog opens; image inside a **circular** frame, fully covered — no gap at any edge |
| S8 | Drag the image; move the zoom slider; click `+` / `−` | Preview follows continuously; the image can never be dragged so far that a gap appears |
| S9 | Repeat with `photo.webp`, a PNG, and a JPEG | All four accepted formats behave identically (FR-003) |
| S10 | Confirm, watching the **Network** tab | Exactly three requests, in order: `POST /me/image/upload-url` → `PUT` to `*.storage.supabase.co` → `PUT /me/image`. **The image bytes appear only in the middle request** |
| S11 | During S10, watch the dialog | Progress indicator advances during the storage `PUT`; confirm disabled throughout |
| S12 | On completion | Dialog closes; success toast; avatar shows the **new framing** |
| S13 | Reload the page | New photo persists — it came from the server, not client state |
| S14 | Sign out and sign back in | New photo still shown (FR-015). The Profile page is the app's only avatar placement, so there is no other screen to check |
| S15 | Inspect the storage `PUT` request headers | `Content-Type: image/webp` matches what was signed — a mismatch here is the classic signature failure |
| S16 | In Supabase Storage, open the bucket | Exactly **one** object under `avatars/{yourUserId}/`; download it — a square WEBP ≤ 512×512 showing your framing, **not** the original photo (FR-019, RN-04) |

### Cancellation — User Story 2 (P2) — FR-004, FR-010, SC-003

The presigned flow raises the stakes here: cancelling must issue **no** `POST /me/image/upload-url` at all. A signed URL minted for an abandoned edit is a live write capability into the bucket that nobody will ever use — and with FR-027a deferred, nothing else bounds how many of those a session can accumulate.

| # | Step | Expected |
|---|------|----------|
| S16a | Choose "Enviar imagem", dismiss the picker without choosing | No dialog; avatar unchanged; **zero** network requests (FR-004) |
| S16b | Select a file, then click Cancel | Dialog closes; avatar unchanged; still **no** request — not even the sign step (FR-010) |
| S16c | Select a file, press `Esc` | Same as S16b |
| S16d | Select a file, click the overlay outside the dialog | Same as S16b |
| S16e | After any cancel, activate the avatar again | Menu opens; "Enviar imagem" restarts the flow cleanly |
| S16f | Cancel, then select the **exact same file** again | Crop dialog reopens with that image — a common bug when `input.value` is not reset |
| S16g | Throttle to Slow 3G, confirm, then rapidly click confirm again and press `Esc` | Exactly **one** sign request and **one** storage `PUT`; the dialog does not close mid-flight (FR-013, SC-007) |

### Rejections and failures — User Story 3 (P3) — SC-004

| # | Step | Expected |
|---|------|----------|
| S17 | Select `fake.jpg` (a PDF renamed) | Error toast naming accepted formats; no dialog; can select again (FR-024/025) |
| S18 | Select `big.jpg` (> 5 MB) | Error toast stating the size limit; no dialog; no request |
| S19 | Select `broken.jpg` (truncated) | Error toast; no dialog — the `createImageBitmap` decode check caught it |
| S20 | Select a `.heic` and an animated `.gif` | Both rejected with the unsupported-format message |
| S21 | Crop a valid image; set DevTools **Offline**; confirm | Error toast; avatar unchanged; **dialog stays open with the crop preserved** |
| S22 | Back Online; confirm again without reselecting | Succeeds with the same framing, starting a **fresh** `POST /me/image/upload-url` (FR-016) |
| S23 | Confirm, then in DevTools block only the third request (`PUT /me/image`) | Error toast; avatar unchanged; the orphaned object is visible in the bucket — it will be swept on the next successful save (see S31) |

### Server-side validation — FR-026, SC-006, research R-010

**This is the section that proves the presigned strategy did not forfeit "never trust the frontend."** Grab a session cookie from DevTools first.

| # | Step | Expected |
|---|------|----------|
| S24 | Sign a URL normally, but `curl -X PUT "<uploadUrl>" -H 'Content-Type: image/webp' --data-binary @fake.jpg`, then commit that key via `PUT /me/image` | Commit returns **400**; `user.image` unchanged; the object is **deleted** from the bucket |
| S25 | Commit a key for an object that was never uploaded | **404**; profile unchanged |
| S26 | Commit a key belonging to **another user** (`avatars/{otherUserId}/…`) | **400**; profile unchanged; **no storage call made** — the ownership check runs first |
| S27 | Commit a key outside the prefix, e.g. `../../etc/passwd` or `avatars/../x.webp` | **400**; no traversal reaches storage |
| S28 | Request an upload URL with `contentLength` above `AVATAR_MAX_BYTES` | **400** at the sign step |
| S29 | Upload a file **larger** than `AVATAR_MAX_BYTES` through a URL signed for a small size, then commit | Commit returns **413** — `HeadObject` reports the real size regardless of what was signed |
| S30 | Any of the above error bodies | No bucket name, object key, or storage hostname leaked (FR-029) |
| S31 | Call `POST /me/image/upload-url`, wait 90 seconds, then use the URL | Storage rejects it — the 60s expiry is enforced |
| ~~S31a–c~~ | ~~Rate-limit scenarios~~ | **Removed** — FR-027a is deferred and the endpoint answers no `429`. Restore these when the limiter returns (contracts/create-upload-url.md) |

### Replacement, sweep, and removal — RN-01/02, FR-022, FR-023a–e

| # | Step | Expected |
|---|------|----------|
| S32 | With a photo set, upload a second one | Success; bucket holds exactly **one** object for the user — the old one and any orphan from S23 are both gone (FR-022, research R-011) |
| S33 | Repeat 5 more times, then count objects under `avatars/{userId}/` | Still exactly one (SC-011) |
| S34 | `select image from "user" where id = '<userId>'` | Points at the **public** URL (`/storage/v1/object/public/…`), not the S3 endpoint; and differs from the previous upload |
| S35 | Open the avatar menu, choose **Remover imagem** | Loading state; success toast; initials fallback returns |
| S36 | Reload the page | Initials fallback persisted (SC-012) |
| S37 | Check the bucket | No object remains under `avatars/{userId}/` (FR-023b) |
| S38 | Open the menu again | "Remover imagem" now disabled (FR-001b) |
| S39 | Call `DELETE /me/image` twice in a row | Both return `204` with no body and no `content-type` — idempotent |
| S40 | Sign in with a **Google** account that never uploaded; remove the photo | Profile reference cleared; **no** delete attempted against `googleusercontent.com`; backend logs clean (FR-023b) — the path most likely to be implemented wrong |
| S40a | As that Google user, after removing: sign out, then sign back in with Google | Initials fallback **still** showing — the provider picture is not restored (FR-023f). The default config already does this, so the check is that nothing re-enabled the override |
| S41 | As that same Google user, upload a photo | Succeeds; no delete attempted against the provider URL (FR-023) |
| S42 | Start an upload; while it is in flight, try the menu | Both items disabled — no concurrent upload or removal (FR-013, FR-023c) |

### Responsiveness — FR-033, SC-009

| # | Step | Expected |
|---|------|----------|
| S43 | Device toolbar at **320px**; run S1–S12 | Menu and dialog fit; no horizontal scroll; cropper usable; all actions reachable |
| S44 | At 320px, measure menu items, `+`/`−`, confirm/cancel | Each ≥ 44×44px |
| S45 | Touch device or emulation: pinch to zoom, drag to pan | Both work; the page behind the dialog does not pan or zoom |
| S46 | Tablet (768px) and desktop (1280px+) | Layout scales sensibly; cropper not stretched or oddly letterboxed |

### Accessibility — FR-030, FR-031, FR-032, FR-023e, SC-008, SC-013

| # | Step | Expected |
|---|------|----------|
| S47 | `Tab` to the avatar | Visible focus ring; announced with its purpose, not just "button" |
| S48 | `Enter`/`Space` on it | Menu opens |
| S49 | With the dialog open, `Tab` repeatedly | Focus cycles **only** inside the dialog, never reaching the page behind |
| S50 | Focus the zoom slider, press `←` / `→` | Zoom changes in steps |
| S51 | Press `Esc` in the dialog | Closes; focus **returns to the avatar trigger** |
| S52 | VoiceOver (`Cmd+F5`) through the full flow | Dialog announced; every control labelled; uploading / success / error announced |
| S53 | Complete upload **and** removal keyboard-only | Both possible end to end (SC-008, SC-013) |
| S54 | Contrast of dialog and menu in **both** light and dark theme | Meets the app's existing level (`next-themes` is installed — check both) |

### Performance and memory — SC-002, SC-010

| # | Step | Expected |
|---|------|----------|
| S55 | Select `huge.jpg` (20 MP); drag and zoom continuously | Smooth; no multi-second freeze on open (what `createImageBitmap` buys — research R-007) |
| S56 | Performance recording while confirming `huge.jpg` | No long task blocking the main thread during encode |
| S57 | Memory: heap snapshot → run the full flow 10× → force GC → snapshot | No accumulating detached `ImageBitmap`/`Blob`; retained size near baseline (SC-010, FR-017) |
| S58 | Console after the dialog closes | No "revoked object URL" warnings, no uncaught errors |
| S59 | Backend memory during a 2 MB upload | Flat — the API never receives image bytes, which is the main win of this strategy |

### Console and network hygiene

| # | Step | Expected |
|---|------|----------|
| S60 | Console across the whole session | No errors, no React warnings (keys, controlled inputs, hydration) |
| S61 | Network across the whole session | No failed requests beyond those deliberately triggered; **no CORS errors** on the storage `PUT` |

---

## 3. Definition of done

- [ ] S1–S61 all observed as specified (including S16a–g, S31a–c, and S40a)
- [ ] Spec acceptance scenarios US1 (1–7), US2 (1–5), US3 (1–5), US4 (1–8) each mapped to a passing step
- [ ] SC-001 … SC-013 each demonstrated
- [ ] `npm run lint` clean in **both** workspaces
- [ ] `npm run build` succeeds in both workspaces
- [ ] `npx orval` run after the backend changes, and `fetch-generated/` committed
- [ ] No file under `packages/backend/src/generated/`, `packages/web/src/lib/api/fetch-generated/`, or `packages/web/src/lib/api/schemas/` edited by hand
- [ ] `packages/backend/.env.example` documents all new variables with Portuguese comments
- [ ] Bucket CORS configured for every deployed web origin, not just localhost
- [ ] No automated test files added anywhere (Constitution I)
- [ ] Chrome DevTools MCP validation performed at 320px and 1280px per the project's mandatory UI validation rule
