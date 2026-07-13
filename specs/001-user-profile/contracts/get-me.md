# Contract: `GET /me` (existing — consumed, not created)

This feature adds **no new API contract**. It consumes the existing endpoint below,
which is already implemented and already present in the Orval-generated web client.
No `npx orval` regeneration is required.

## Endpoint

- **Method / Path**: `GET /me`
- **operationId**: `getUser`
- **Backend**: `packages/backend/src/routes/me.routes.ts` → `GetUser` use-case
- **Auth**: Requires a valid session (`getSession`); protected route
- **Web client**: `getUser()` from `@/lib/api/fetch-generated`
  (import aliased, e.g. `import { getUser as getProfile }`, to avoid the name
  collision with `lib/dal.ts`'s `getUser`)

## Responses

### 200 — profile found

Body matches `UserSchema`:

```jsonc
{
  "id": "uuid",
  "name": "string",
  "image": "string | null",
  "age": 28,                    // positive integer (years)
  "weightInGrams": 70000,       // integer >= 1
  "heightInCentimeters": 170,   // integer >= 1
  "bodyFatPercentage": 400      // integer 0..1000 (40% = 400)
}
```

### 404 — no profile (onboarding not completed)

Returned when the user has no `UserProfile` row (`GetUser` throws `NotFoundError`).
Body matches `ErrorSchema`. **Frontend behavior**: `redirect('/onboarding')` before
render.

### 401 — unauthenticated

Body matches `ErrorSchema`. Normally prevented by `proxy.ts` before the page loads.

### 500 — server error

Body matches `ErrorSchema`. Treated as non-200 → redirect to `/onboarding`.

## Frontend consumption rule

```text
const res = await getProfile()          // server-side, in the Server Component
if (res.status !== 200) redirect('/onboarding')
// res.data is the 200 shape above
```

This single rule satisfies FR-001, FR-013 and matches the home page's
`if (homeData.status !== 200) redirect('/onboarding')` pattern.
