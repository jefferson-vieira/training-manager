# Contract: `POST /me/image/upload-url`

**Feature**: `011-profile-photo-crop` | **Operation ID**: `createAvatarUploadUrl` | **Tag**: `Me`

Step ① of the upload handshake. Issues a short-lived presigned `PUT` so the browser can send image bytes **directly to storage**, bypassing the API.

The backend is the source of truth for this shape. After implementing it, regenerate the web client (`cd packages/web && npx orval` with the backend running).

---

## Route registration

Registered in `packages/backend/src/routes/me.routes.ts` (mounted under the `/me` prefix, which sits under an outer `/api` prefix). **Full path on the wire: `POST /api/me/image/upload-url`.** The `/me/...` form used throughout these contracts is the route-file-relative path; every `curl` must include `/api`.

`POST` rather than `GET`: the call is not idempotent in any useful sense — each invocation mints a new key and a new signature — and it carries a body.

---

## Request

**Content-Type**: `application/json`

**Body** — `packages/backend/src/dtos/CreateAvatarUploadUrlRequest.ts`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `contentLength` | `number` | `int`, `min(1)`, `max(AVATAR_MAX_BYTES)` | Byte size of the cropped image about to be uploaded |

```ts
export const CreateAvatarUploadUrlRequest = z.object({
  contentLength: z.number().int().min(1).max(env.AVATAR_MAX_BYTES).meta({
    description:
      'Tamanho em bytes da imagem já recortada que será enviada. ' +
      'Verificado novamente no servidor após o upload — este valor é apenas ' +
      'uma triagem inicial e não deve ser tratado como garantia.',
  }),
});
```

There is deliberately **no** `key` field and **no** `contentType` field. The key is generated server-side (V-6) — accepting one from the client would let a caller write over another user's object or outside the avatars prefix. The content type is fixed at `image/webp`, since that is what the client encoder always produces.

**`contentLength` is not a security control.** It is signed into the URL so a well-behaved client is held to it, but the authoritative size check happens on commit via `HeadObject` (V-11). Treating this number as trusted is the exact mistake research R-010 exists to prevent.

---

## Responses

### `200 OK` — `packages/backend/src/schemas/AvatarUploadUrlSchema.ts`

| Field | Type | Description |
|-------|------|-------------|
| `uploadUrl` | `string` | Presigned `PUT` URL, valid for `expiresIn` seconds |
| `key` | `string` | Object key the client must echo back on commit |
| `expiresIn` | `number` | Lifetime of `uploadUrl` in seconds (60) |

```ts
export const AvatarUploadUrlSchema = z.object({
  expiresIn: z.number().int().meta({
    description: 'Validade da URL assinada, em segundos',
  }),
  key: z.string().meta({
    description: 'Chave do objeto no bucket; deve ser reenviada em PUT /me/image',
  }),
  uploadUrl: z.string().meta({
    description: 'URL assinada para envio direto da imagem ao storage',
  }),
});
```

Returning `key` separately spares the client from parsing it out of the signed URL.

### Error responses — existing `ErrorSchema`

| Status | `code` | When | Client treatment |
|--------|--------|------|------------------|
| `400` | `VALIDATION_ERROR` | `contentLength` missing, non-integer, or above `AVATAR_MAX_BYTES` | "Imagem muito grande." — the client already checks this, so reaching it means a client bug |
| `401` | `UNAUTHORIZED` | No valid session (V-8) | Session expired — send the user to sign in |
| `500` | `INTERNAL_SERVER_ERROR` | Signing failed (misconfigured credentials, endpoint, or region) | Generic failure with retry; the response must not leak endpoint or bucket details (FR-029) |

---

## Rate limiting (FR-027a) — deferred, **not implemented**

As of 2026-08-07 this endpoint applies **no** rate limit and never answers `429`. The in-memory limiter that shipped with the feature was removed along with its `AVATAR_UPLOAD_RATE_LIMIT_*` env vars, because a per-process counter neither survives a restart nor holds across a second instance — it read as a bound without being one.

When it is reintroduced, the shape stays as designed:

- This endpoint is the one that hands out a storage-write capability, so it is where the bound belongs — not on commit, which merely references an object that already exists.
- **~10 requests per 5-minute window, per user**, env-configurable.
- Keyed by **user id**, not IP — the endpoint is authenticated, and per-user is what actually bounds bucket writes.
- Refused **before** signing, so no capability is issued.
- Add `429`/`TOO_MANY_REQUESTS` back to the response table above and to the route's Zod `response` map, then regenerate the Orval clients.

Note that better-auth's built-in `rateLimit` covers better-auth's own routes, not application routes; this limit needs its own implementation. `lib/password-reset-rate-limit.ts` remains the in-repo precedent for the counter shape, and carries the same per-process caveat.

---

## Handler outline

```
POST /me/image/upload-url
  ├─ getSession(request, reply)                     → 401 guard, returns early
  ├─ new CreateAvatarUploadUrl().execute({
  │     userId: session.user.id,                    ← never from the body
  │     contentLength: request.body.contentLength,
  │   })
  └─ reply.status(200).send({ uploadUrl, key, expiresIn })
```

### `CreateAvatarUploadUrl.execute()`

1. Build the key: `avatars/${userId}/${crypto.randomUUID()}.webp`.
2. Sign a `PutObjectCommand` with `Bucket`, `Key`, `ContentType: 'image/webp'`, and `ContentLength`, using `getSignedUrl(...)` from `@aws-sdk/s3-request-presigner` with `{ expiresIn: 60 }`.
3. Return `{ uploadUrl, key, expiresIn: 60 }`.

**60 seconds** is deliberate: the URL is used immediately by a client that already holds the bytes in memory. A longer window widens the period in which a leaked URL is usable, and buys nothing — a slow or failed upload retries from step ① with a fresh URL, which the state machine already specifies.

**Signed headers must match on the wire.** Whatever is signed here (`Content-Type`, `Content-Length`) the browser must send byte-identically in step ②, or storage rejects the request with a signature mismatch. This is the most common way this endpoint "works" while the upload still fails — see `quickstart.md` S15.

---

## Client usage (step ②, not an API call)

The browser sends the blob to `uploadUrl` with `XMLHttpRequest` rather than `fetch`, solely because `xhr.upload.onprogress` is the only way to report upload progress (research R-003). Wrapped in `packages/web/src/lib/upload.ts`.

```
PUT {uploadUrl}
Content-Type: image/webp
<binary body>
→ 200
```

**This request is cross-origin and preflighted.** The bucket must have a CORS rule allowing the web origin, the `PUT` method, and the `Content-Type` header, or the browser blocks it while `curl` succeeds against the same URL (research R-012).
