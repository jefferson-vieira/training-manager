# Contract: `PUT /me/image`

**Feature**: `011-profile-photo-crop` | **Operation ID**: `updateUserImage` | **Tag**: `Me`

Step ③ of the upload handshake — the commit. Verifies the object the browser uploaded directly to storage, then points the profile at it.

**This endpoint is the security boundary of the whole feature.** The API never saw the bytes, so everything FR-026 asks for happens here. See [research.md](../research.md) R-010.

---

## Route registration

`packages/backend/src/routes/me.routes.ts`, under the `/me` prefix, which sits under an outer `/api` prefix. **Full path on the wire: `PUT /api/me/image`.**

`PUT` rather than `POST`: the request replaces the single photo the user has, and re-sending the same body yields the same end state (RN-01, RN-02).

---

## Request

**Content-Type**: `application/json`

**Body** — `packages/backend/src/dtos/UpdateUserImageRequest.ts`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `key` | `string` | non-empty | The object key returned by `POST /me/image/upload-url` |

```ts
export const UpdateUserImageRequest = z.object({
  key: z.string().nonempty().meta({
    description:
      'Chave do objeto retornada por POST /me/image/upload-url. ' +
      'O servidor valida que a chave pertence ao usuário autenticado e ' +
      'inspeciona o objeto antes de vinculá-lo ao perfil.',
  }),
});
```

No `contentType`, no `size`, no URL. Every property of the uploaded object is **read from storage**, never accepted as a claim. The key itself is treated as untrusted input and validated by shape before use (V-10).

Body is a few hundred bytes, so no `bodyLimit` override is needed — unlike the earlier base64 design.

---

## Responses

### `200 OK` — `packages/backend/src/schemas/UserImageSchema.ts`

| Field | Type | Description |
|-------|------|-------------|
| `image` | `string` | Public URL of the newly committed photo |

```ts
export const UserImageSchema = z.object({
  image: z.string().meta({
    description: 'URL pública da nova foto de perfil do usuário',
  }),
});
```

Non-nullable here, unlike `UserSchema.image` — a successful commit always yields a URL.

### Error responses — existing `ErrorSchema`

| Status | `code` | When | Client treatment |
|--------|--------|------|------------------|
| `400` | `VALIDATION_ERROR` | Key fails the ownership pattern (V-10), or the object's first bytes match no accepted signature (V-12) | "Formato de imagem inválido." Dialog stays open, crop preserved, retry allowed |
| `401` | `UNAUTHORIZED` | No valid session (V-8) | Session expired — direct the user to sign in |
| `404` | `NOT_FOUND_ERROR` | `HeadObject` reports no such object — the client committed a key it never uploaded, or the upload silently failed | Generic failure with retry from step ① |
| `413` | `PAYLOAD_TOO_LARGE` | Actual `ContentLength` exceeds `AVATAR_MAX_BYTES` (V-11) | "Imagem muito grande." |
| `500` | `INTERNAL_SERVER_ERROR` | Storage unreachable, or the profile write failed | "Não foi possível atualizar sua foto." Retry offered; crop preserved (FR-016) |

Error bodies must not carry bucket names, object keys, or storage hostnames (FR-029). The storage layer logs detail server-side; the response says only what the user can act on.

---

## Handler outline

```
PUT /me/image
  ├─ getSession(request, reply)              → 401 guard, returns early
  ├─ new UpdateUserImage().execute({
  │     userId: session.user.id,             ← never from the body
  │     key: request.body.key,
  │   })
  └─ reply.status(200).send({ image })
```

All logic sits in `use-cases/user/UpdateUserImage.ts` — the handler only wires session, use-case, and reply, per the constitution's layering rule.

### `UpdateUserImage.execute()` sequence

**Verify (V-10 → V-11 → V-12), cheapest first. Each step gates the next.**

1. **Ownership** — reject unless `key` matches `avatars/{userId}/…`. Free, and it is what stops a caller from pointing their profile at another user's object. No storage call happens before this passes.
2. **`HeadObject`** — 404 if absent; 413 if `ContentLength > AVATAR_MAX_BYTES`. This is the *real* size; the `contentLength` sent at step ① was only a courtesy screen.
3. **`GetObject` with `Range: bytes=0-11`** — match the first bytes against JPEG / PNG / WEBP signatures; 400 otherwise. Twelve bytes, not the whole object — downloading it would forfeit the entire point of uploading direct to storage.

**Commit**

4. Read the current `user.image` (single `findUnique` selecting only `image`) — needed for step 6.
5. `prisma.user.update` setting `image` to `{SUPABASE_URL}/storage/v1/object/public/{bucket}/{key}`.

**Clean up (best-effort, never fails the request)**

6. `ListObjectsV2` on `avatars/{userId}/` and delete every object **except** the just-committed key. Wrap in `try/catch`; log and continue on failure.

Step 6 replaces a targeted "delete the previous URL" and does more: it satisfies FR-022, collects orphans from uploads that were never committed, and makes SC-011 ("exactly one object per user") structurally true rather than merely intended (research R-011).

**On verification failure (steps 1–3)**: delete the offending object before returning the error, so a rejected upload leaves nothing behind in a public bucket. Skip this when step 1 failed — the key is not ours to delete.

**Ordering rationale**: verify before commit, commit before sweep. Committing first would let an unverified object be referenced; sweeping first would risk deleting the object about to be referenced. The sweep's exclusion filter must name the committed key explicitly — an off-by-one there deletes the user's current avatar, and Supabase Storage has no versioning to recover it.

---

## Contract regeneration checklist

- [ ] Backend running (`npm run dev` in `packages/backend`), all three routes visible at `/docs`
- [ ] `cd packages/web && npx orval`
- [ ] `createAvatarUploadUrl`, `updateUserImage`, and `removeUserImage` appear in `src/lib/api/fetch-generated/index.ts`
- [ ] No hand-written avatar DTO anywhere in `packages/web`
- [ ] `packages/web/src/lib/api/schemas/` regenerated if present (never edited by hand)
