# Contract: `DELETE /me/image`

**Feature**: `011-profile-photo-crop` | **Operation ID**: `removeUserImage` | **Tag**: `Me`

Backs the *Remover imagem* action (FR-023a–e). Clears the user's profile photo so the interface falls back to initials, and deletes the stored object when it is one we own.

---

## Route registration

`packages/backend/src/routes/me.routes.ts`, under the `/me` prefix, which sits under an outer `/api` prefix. **Full path on the wire: `DELETE /api/me/image`.**

Naturally idempotent: removing an already-removed photo succeeds and produces the same end state, which is what the spec's edge case "removing a photo already removed in another tab" requires.

---

## Request

No body, no parameters. The user is derived from the session (V-9) — there is no `:userId` to tamper with.

---

## Responses

### `204 No Content` — no body

Removal has no representation to return: the outcome is always the absence of a photo, which the status code already states. A body carrying `{ image: null }` would only restate it, and the client never reads the value — it re-renders from the revalidated server data.

Declared as `204: z.undefined()`, the idiom `fastify-type-provider-zod` documents for an empty body: it types `reply.send()` with no argument and emits a `204` with no `content` in the OpenAPI output.

Because this is the only endpoint that answers without a body, `customFetch` (`packages/web/src/lib/fetch.ts`) must skip `response.json()` on a `204` — parsing an empty payload throws.

### Error responses — existing `ErrorSchema`

| Status | `code` | When | Client treatment |
|--------|--------|------|------------------|
| `401` | `UNAUTHORIZED` | No valid session (V-8) | Session expired — direct the user to sign in |
| `500` | `INTERNAL_SERVER_ERROR` | The profile write failed | "Não foi possível remover sua foto." Photo unchanged; retry allowed (FR-023d) |

**A failed object deletion is not an error.** If the profile was cleared but the storage delete failed, the request still returns `204` — the user's intent is satisfied and the leftover object is unreferenced and will be collected by the next successful upload's prefix sweep. Failing here would tell the user their removal did not work when it did.

---

## Handler outline

```
DELETE /me/image
  ├─ getSession(request, reply)          → 401 guard, returns early
  ├─ new RemoveUserImage().execute({ userId: session.user.id })
  └─ reply.status(204).send()
```

### `RemoveUserImage.execute()` sequence

1. Read the current `user.image` (single `findUnique` selecting only `image`).
2. If it is already `null`, return immediately — nothing to clear, nothing to delete (guard clause; idempotency).
3. `prisma.user.update` setting `image` to `null`.
4. **Only if** the old URL passes the ownership check (`isOwnedAvatarUrl`), delete the object. Wrap in `try/catch`; log and continue on failure.

Returns nothing: the use case's job is the state change, and the route answers `204`.

**Step 4 is FR-023b and the highest-risk line in this feature.** A Google user's `image` is a `googleusercontent.com` URL we do not own — attempting to delete it is at best a wasted call against a foreign host and at worst an error path that surfaces to the user. Use the *same* `isOwnedAvatarUrl` helper as `UpdateUserImage`, never a second copy of the rule (data-model.md).

Because Supabase Storage has no versioning, step 4 is irreversible — which is consistent with the spec's exclusion of photo recovery, but means the ownership check has no safety net.

**Ordering rationale**: clear the reference first, delete after. The user-visible state is then correct even if cleanup fails, and the profile never points at an object that no longer exists.

---

## Provider sync must not resurrect a removed photo (FR-023f)

Removal sets `user.image` to `null` — which is exactly the state a provider sync would read as "empty, populate it". If Google sign-in repopulates the field, the user's removal silently undoes itself on their next sign-in, and no second removal would make it stick.

**Verify rather than build.** better-auth does not overwrite existing user fields on subsequent sign-ins by default; the behavior is governed by the Google provider's user-info override setting in `packages/backend/src/lib/auth.ts`, which is currently unset. The task here is to **confirm** it stays off and to cover it in manual verification — not to add a mechanism. If it is ever enabled for another reason, `image` must be excluded.

This is cheap to get wrong precisely because the default is already correct: nothing fails today, so nothing prompts anyone to check, and a future config change would regress it silently.

---

## Client integration

Invoked through a server action in `profile/actions.ts` that calls the generated `removeUserImage()` and then `revalidatePath` on the `(protected)` layout segment — the same mechanism the upload commit uses, which is what returns the Profile page to the initials fallback without a manual reload (FR-023a).

The menu item is disabled whenever `status !== 'idle'` or the user has no photo (FR-001b), so this endpoint should never be reached concurrently with an upload.
