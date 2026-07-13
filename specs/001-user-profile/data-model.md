# Phase 1 Data Model: User Profile Screen

This feature is **read-only** and introduces **no new persisted entities**. It
consumes the existing `GET /me` response. The shapes below document what the screen
reads and how it is presented; they are not new contracts.

## Consumed entity: User (from `GET /me`)

Source of truth: `packages/backend/src/schemas/UserSchema.ts` (Orval-generated type
`getUserResponse200` in `@/lib/api/fetch-generated`).

| Field | Type (from API) | Meaning | Screen usage |
|-------|-----------------|---------|--------------|
| `id` | `string` (uuid) | User id | Not displayed |
| `name` | `string` | User name | Optional header/greeting |
| `image` | `string \| null` | Profile photo URL | Optional avatar (if design shows one) |
| `age` | `number` (positive int) | Age in years, computed backend-side from `birthdate` | Displayed — "Idade" |
| `weightInGrams` | `number` (int ≥ 1) | Weight in grams (70kg = 70000) | Displayed as kg — "Peso" |
| `heightInCentimeters` | `number` (int ≥ 1) | Height in cm (1.70m = 170) | Displayed — "Altura" |
| `bodyFatPercentage` | `number` (int 0–1000) | Body fat, 0–1000 scale (40% = 400) | Displayed as % — "% Gordura" |

### Underlying persistence (context only — not modified)

`UserProfile` (Prisma, `packages/backend/prisma/schema.prisma`): `birthdate` (Date),
`bodyFatPercentage` (Int), `heightInCentimeters` (Int), `weightInGrams` (Int),
`userId` (unique). Written exclusively by the onboarding flow (`UpsertUserProfile`).
`age` is derived from `birthdate` at read time by the `GetUser` use-case.

## Presentation model (frontend formatting)

Pure formatters in `lib/format.ts` map API values → display strings:

| Formatter | Input | Output example |
|-----------|-------|----------------|
| `formatWeight(weightInGrams)` | `70000` | `"70 kg"` |
| `formatHeight(heightInCentimeters)` | `170` | `"170 cm"` (or `"1,70 m"` per Figma) |
| `formatBodyFat(bodyFatPercentage)` | `400` | `"40%"` (0–1000 → ÷10) |
| `formatAge(age)` | `28` | `"28 anos"` |

Each formatter returns a placeholder (`"—"`) when its input is `null`/`undefined`
(FR-014). Exact unit rendering (kg vs g, m vs cm, decimal separator) follows the
Figma design `3606-608` and existing app conventions.

## Response states → UI behavior

| `GET /me` status | Meaning | Screen behavior |
|------------------|---------|-----------------|
| `200` | Profile exists | Render profile fields (FR-002–FR-005, FR-007) |
| `404` | No profile / onboarding not completed | `redirect('/onboarding')` before render (FR-013) |
| `401` | Not authenticated | Handled earlier by `proxy.ts` → `/login`; non-200 also redirects to onboarding as a fallback |
| `500` | Server error | Non-200 → redirect to `/onboarding` (consistent with home flow) |

## State transitions

None. The screen performs no mutations. The only user-triggered transition is
**logout**, which ends the session (better-auth) and navigates to `/login`; after
that, `proxy.ts` blocks access to protected routes (FR-011, FR-012).
