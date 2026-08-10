# Feature Specification: Atualização da Foto de Perfil com Recorte (Profile Photo Update with Crop)

**Feature Branch**: `011-profile-photo-crop`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "Permitir que o usuário altere sua foto de perfil através da página de Perfil, oferecendo uma experiência simples e intuitiva, incluindo seleção da imagem, recorte antes do upload e atualização imediata do avatar."

## Overview

Today the avatar on the Profile page is read-only: it shows either the picture inherited from the user's Google account or the initials fallback. A user who signed up with e-mail and password has no way to ever have a picture, and a Google user has no way to change the one they arrived with.

This feature makes the avatar the entry point for managing the profile photo. Tapping it opens a menu with two actions. **"Enviar imagem"** picks an image from the device, frames it inside a circular crop preview, and on confirmation replaces the old photo — only the cropped result leaves the device; the original file is never uploaded and never kept after the flow ends. **"Remover imagem"** clears the photo and returns the interface to the initials fallback.

## Clarifications

### Session 2026-08-05

- Q: "Everywhere the avatar appears" — where is that, concretely? → A: **The Profile page, and only the Profile page.** The app renders the avatar in exactly one place today, and this feature adds no new placements. Requirements and acceptance criteria are narrowed to "updates on the Profile page without a manual reload, and survives a reload" rather than claiming a breadth that cannot be verified. Any placement added later inherits the behavior automatically, since the whole protected area is revalidated after a change.
- Q: What happens when the same user saves a photo from two tabs or devices at once? → A: **Accepted as a known risk — no concurrency control.** Two simultaneous avatar changes by one user are considered rare enough not to warrant versioning or locking. Documented consequence: if one commit's cleanup runs after the other's commit, it can delete the object the profile now points at. The avatar component falls back to the initials on a failed image load, so the user sees their photo apparently vanish rather than a broken image — and must upload again. Storage has no versioning, so the deleted object is unrecoverable.
- Q: What bounds how many uploads a user can start, given each one issues a write capability into a public bucket? → A: **Rate-limit the upload-URL request per user** — approximately 10 requests per 5-minute window, env-configurable, reusing the existing `AUTH_RATE_LIMIT_*` pattern; over-limit requests are rejected with 429. Capping at the point the capability is issued bounds bucket writes directly, and no legitimate user approaches 10 avatar changes in five minutes. **Reversed 2026-08-07**: the limiter was removed and the bound left unenforced, to be reintroduced on shared state rather than per-process memory. See FR-027a.
- Q: What must be observable when the silent storage paths fail (orphan sweep, object delete, ownership-check skip)? → A: **No logging requirement in the spec** — left to implementation judgement. Noted tradeoff: these paths deliberately return success to the user, so a storage misconfiguration or a defect in the ownership check will not surface anywhere. Diagnosis would rely on inspecting the bucket directly.
- Q: Does a later Google sign-in restore a photo the user removed? → A: **No — removal is permanent.** The identity provider's picture is applied only when the account is first created; after that the provider never writes to the profile photo again, whether the user uploaded one, removed one, or has none. Silently restoring a deliberately removed picture would look like the removal failed, with no second removal that could make it stick.
- Q: Should the avatar open the file picker directly, or offer a choice first? → A: **A dropdown menu.** Activating the avatar opens a menu with two actions — "Enviar imagem" and "Remover imagem". Only "Enviar imagem" opens the file picker. This supersedes the original single-action entry point.
- Q: Removal was originally out of scope — is it now in? → A: **Yes, removal is in scope.** "Remover imagem" clears the user's photo and returns the interface to the initials fallback, deleting the stored object. The action is unavailable when the user has no photo to remove. Restoring a removed photo remains out of scope — removal is irreversible, and the user's recourse is to upload again.
- Q: Where should the cropped photo be persisted, given the backend has no storage integration today? → A: **External object storage** (the project already serves a public asset from Supabase Storage). The cropped image is uploaded to a bucket and the resulting public URL is stored on the user record, exactly like the identity-provider URL it replaces. Replacing a photo deletes the previous object. Accepted tradeoff: this introduces one new backend dependency and a set of bucket credentials — justified under Constitution V because neither the database (binary bloat in every backup) nor the local filesystem (lost on redeploy, unusable across instances) can serve durable user-uploaded media.

## User Scenarios *(mandatory)*

### User Story 1 - Change the profile photo with controlled framing (Priority: P1)

An authenticated user opens the Profile page and taps their avatar. A menu opens; they choose "Enviar imagem" and the device's native file picker opens. They choose a photo. A crop dialog opens showing the photo inside a circular frame, which they can drag and zoom until the framing looks right. They confirm, a loading indicator appears, and within a moment the dialog closes, a success message is shown, and the avatar on the page shows the newly framed photo.

**Why this priority**: This is the entire value of the feature. Without it there is nothing to cancel and nothing to recover from. Delivered alone, it already lets every user personalize their profile.

**Independent Verification**: Sign in, open `/profile`, tap the avatar, choose "Enviar imagem", pick a local JPG, drag and zoom it in the dialog, confirm, and observe the avatar change on the page without reloading. Then reload to confirm the new photo persisted and is not a stale cached copy.

**Acceptance Scenarios**:

1. **Given** I am on the Profile page, **When** I activate the avatar and choose "Enviar imagem", **Then** the device's native file picker opens restricted to image files.
2. **Given** the file picker is open, **When** I select a valid JPG, JPEG, PNG, or WEBP image, **Then** a crop dialog opens showing that image inside a circular frame.
3. **Given** the crop dialog is open, **When** I drag the image or change the zoom level, **Then** the framed preview updates immediately as I interact, showing exactly the region that will be saved.
4. **Given** I have framed the image, **When** I confirm, **Then** a loading indicator is shown, the confirm action is disabled, and only the cropped region is sent — never the original file.
5. **Given** the upload succeeded, **When** the dialog closes, **Then** a success message is shown and the avatar on the Profile page displays the new photo without a manual reload.
6. **Given** the upload succeeded, **When** I reload the app or sign in again, **Then** the new photo is still shown — it was stored, not just applied locally.
7. **Given** I already have a profile photo, **When** a new one is saved, **Then** the previous photo is no longer referenced by my profile.

---

### User Story 2 - Abandon the change without side effects (Priority: P2)

A user starts the flow and changes their mind — either at the file picker or after seeing the image in the crop dialog. Nothing is uploaded, and the avatar stays exactly as it was.

**Why this priority**: Backing out is the most common branch after the happy path. A flow that silently uploads or leaves the UI in a broken state after a cancel is worse than no flow at all. It is a small slice on top of P1.

**Independent Verification**: Choose "Enviar imagem", then dismiss the picker without choosing a file — confirm the avatar is unchanged and no dialog appears. Then pick a file, cancel the crop dialog three different ways (cancel action, `Esc`, and dismissing the overlay), and confirm the avatar is unchanged, no request was made, and the avatar can immediately be activated again to restart the flow.

**Acceptance Scenarios**:

1. **Given** the file picker is open, **When** I dismiss it without choosing a file, **Then** no dialog opens and the avatar is unchanged.
2. **Given** the crop dialog is open, **When** I cancel it, press `Esc`, or dismiss the overlay, **Then** no image is sent and the avatar is unchanged.
3. **Given** I cancelled the crop dialog, **When** I activate the avatar again, **Then** the menu opens and "Enviar imagem" restarts the flow from the file picker as if nothing had happened.
4. **Given** I cancelled the crop dialog, **When** I select the exact same file again, **Then** the crop dialog reopens with that image.
5. **Given** an upload is in progress, **When** I attempt to cancel or confirm again, **Then** the request is not duplicated and the actions remain unavailable until it settles.

---

### User Story 3 - Recover clearly from rejected files and failed uploads (Priority: P3)

A user picks a file the system cannot accept — the wrong type, a corrupted image, or one over the size limit — or the upload fails on a poor connection. In every case they are told what went wrong in plain language, their existing avatar is untouched, and they can try again immediately.

**Why this priority**: These paths are less frequent than the happy path and the cancel path, but without them a failure looks like the app is broken. It layers cleanly on the two stories above.

**Independent Verification**: Rename a `.pdf` to `.jpg` and select it; select an image above the size limit; select a truncated/corrupted image file. Confirm each shows a specific error and leaves the avatar intact. Then, with the network throttled to offline, confirm a crop and observe the error message plus the ability to retry once the network is restored.

**Acceptance Scenarios**:

1. **Given** I select a file that is not one of the accepted image types, **When** the system inspects it, **Then** an error message naming the accepted types is shown, no dialog opens, and I can select another file.
2. **Given** I select an image larger than the allowed size, **When** the system inspects it, **Then** an error message stating the size limit is shown and no upload occurs.
3. **Given** I select a file that claims to be an image but cannot be decoded, **When** the system attempts to render it, **Then** an error message is shown and no upload occurs.
4. **Given** I confirmed the crop and the upload failed, **When** the failure is detected, **Then** an error message is shown, my current avatar is preserved, and I can retry without reselecting and reframing the image.
5. **Given** the server rejects the image after the client accepted it, **When** the rejection arrives, **Then** the same error treatment applies and the stored photo is unchanged.

---

### User Story 4 - Remove the current photo (Priority: P3)

A user who no longer wants a picture on their profile opens the avatar menu and chooses "Remover imagem". The photo is cleared, the initials fallback returns, and the stored image is deleted.

**Why this priority**: It rounds out the menu introduced for the upload flow — without it the second menu item has nothing behind it. It is genuinely independent: it can be built and demonstrated on its own, and it delivers value (removing an unwanted or outdated picture) even if the crop flow were absent.

**Independent Verification**: With a photo set, open the avatar menu, choose "Remover imagem", and confirm the initials fallback returns on the Profile page without a reload, that it survives a reload and a fresh sign-in, and that the object is gone from storage. Then confirm the menu item is disabled for a user with no photo.

**Acceptance Scenarios**:

1. **Given** I have a profile photo, **When** I open the avatar menu, **Then** both "Enviar imagem" and "Remover imagem" are available.
2. **Given** I have no profile photo, **When** I open the avatar menu, **Then** "Remover imagem" is present but disabled.
3. **Given** I chose "Remover imagem", **When** the removal completes, **Then** the initials fallback is shown without a manual reload and a success message appears.
4. **Given** I removed my photo, **When** I reload the page, **Then** the initials fallback persists — the removal was stored, not just local.
5. **Given** I uploaded my photo through this feature, **When** it is removed, **Then** the stored object is deleted from storage.
6. **Given** my photo came from my Google account, **When** I remove it, **Then** the profile reference is cleared and no deletion is attempted against the provider's URL.
7. **Given** a removal fails, **When** the failure is detected, **Then** an error message is shown and my photo is unchanged.
8. **Given** I removed a photo that originally came from my Google account, **When** I sign out and sign back in with Google, **Then** the initials fallback is still shown — the provider picture is not restored.

---

### Edge Cases

- **Very large source image** (e.g. 8000×6000, 20 MP): framing and cropping must not freeze the interface; the user still sees a responsive preview while dragging and zooming.
- **File renamed to a permitted extension** but whose actual content is not an image: rejected — extension alone never grants acceptance.
- **Image accepted by the client but rejected by the server**: the server's decision wins and the stored photo is unchanged.
- **Source image smaller than the target output size**: accepted; the result is not upscaled beyond what the source supports, and the crop region can never extend past the image bounds.
- **Non-square or extremely elongated source image** (e.g. a panorama): the circular frame stays circular; the image can always be positioned so the frame is fully covered — no empty gaps inside the crop.
- **Formats outside the accepted list** (HEIC from an iPhone, animated GIF, SVG): rejected with the same message as any other unsupported type. Animated sources, if ever accepted, would be saved as a still frame.
- **Repeated confirm taps or a double-click on confirm**: exactly one upload occurs.
- **Navigating away or closing the app mid-upload**: the avatar either updates or does not; it is never left in a partially-updated or corrupted state.
- **Session expired while the crop dialog was open**: the upload is rejected as unauthenticated and the user is directed to sign in again rather than shown a generic failure.
- **A user with no photo at all** (initials fallback showing): the flow is identical — the fallback avatar is just as activatable as a photo, and the menu opens with "Remover imagem" disabled.
- **Removing a photo that was already removed in another tab**: the removal resolves without error; the end state is the same either way.
- **Removal while an upload is in flight** (or vice versa) **in the same client**: the second action is blocked until the first settles. Across separate clients this guard does not apply — see the concurrent-save case below.
- **Slow upload**: progress feedback appears rather than an indefinite frozen dialog.
- **The same user saves a photo from two tabs or devices simultaneously**: not guarded against. The last save wins, and in a narrow interleaving the earlier save's cleanup can remove the object the later one just published. The avatar then falls back to the initials, so the photo appears to vanish rather than showing a broken image, and the user must upload again. Accepted deliberately (see Clarifications); the single-client guard in FR-013 does not extend across clients.
- **A stored photo URL that no longer resolves** (removed out of band, or lost to the concurrent-save case above): the avatar renders the initials fallback rather than a broken image, so the interface stays coherent without special handling.
- **A user starts many uploads in quick succession**: not bounded. Every request mints a fresh write capability, so an authenticated session can write to the bucket as fast as it can call the endpoint. Accepted for now — see FR-027a, deferred.
- **The same image uploaded twice**: the second upload succeeds and the displayed avatar reflects it, without stale-cache artifacts.

## Requirements *(mandatory)*

### Functional Requirements

**Entry point and selection**

- **FR-001**: The avatar on the Profile page MUST be an interactive control that opens a dropdown menu, reachable both by pointer and by keyboard, and labelled for screen readers with its purpose (e.g. "Alterar foto de perfil").
- **FR-001a**: The dropdown MUST contain exactly two actions: **"Enviar imagem"** (starts the upload flow) and **"Remover imagem"** (clears the current photo).
- **FR-001b**: "Remover imagem" MUST be unavailable — disabled, not merely hidden — when the user currently has no photo, so the menu's shape stays stable and the reason is conveyed rather than the option silently vanishing.
- **FR-001c**: The dropdown MUST close on `Esc` and on outside click, returning focus to the avatar trigger, and its items MUST be navigable with arrow keys.
- **FR-002**: Choosing "Enviar imagem" MUST open the device's native file picker, restricted so that only image files are offered by default.
- **FR-003**: The system MUST accept at minimum JPG, JPEG, PNG, and WEBP source images, and MUST reject every other type.
- **FR-004**: Dismissing the file picker without a selection MUST leave the profile and the interface unchanged.

**Framing**

- **FR-005**: After a valid image is selected, the system MUST open a modal crop dialog before any upload occurs.
- **FR-006**: The crop dialog MUST allow the user to reposition the image and to increase and decrease zoom, and MUST render the resulting framing in real time as the user interacts.
- **FR-007**: The crop frame MUST be circular, matching the shape of the avatar, so what the user frames is exactly what they will see afterwards.
- **FR-008**: The crop region MUST always be fully covered by the source image — the user MUST NOT be able to produce a result containing empty area.
- **FR-009**: The crop dialog MUST offer exactly two terminal actions: confirm and cancel.
- **FR-010**: Cancelling the dialog — by the cancel action, by `Esc`, or by dismissing the overlay — MUST send nothing and leave the stored photo and the displayed avatar unchanged.
- **FR-011**: The user MUST NOT be able to save a photo they have not previewed in the crop dialog.

**Upload and result**

- **FR-012**: On confirm, the system MUST produce the cropped image and transmit only that result; the original file MUST NOT be transmitted.
- **FR-013**: While an upload is in progress the system MUST show a loading indicator, disable the confirm action, and prevent a second concurrent upload for the same user.
- **FR-014**: On success the system MUST close the dialog, show a success message, and update the displayed avatar immediately without requiring a page reload.
- **FR-015**: On success the new photo MUST replace the old one on the Profile page — the app's only avatar placement — without a manual reload, and MUST survive a reload and a new sign-in. No cached copy of the user's profile data may keep serving the previous photo. Should further avatar placements be added later, they MUST inherit this behavior without additional work.
- **FR-016**: On failure the system MUST show an error message, preserve the current photo, and allow the user to retry the upload without reselecting and reframing the image.
- **FR-017**: The system MUST release the memory held by the selected image and its temporary preview once the flow ends, whether it ended in success, cancellation, or failure.

**Persistence and storage**

- **FR-018**: Each user MUST have at most one active profile photo; saving a new one MUST replace the reference to the previous one.
- **FR-019**: The image MUST be stored already cropped — the stored asset MUST be the square/circular result the user framed, not the original.
- **FR-020**: The cropped image MUST be persisted in external object storage, and the resulting retrievable URL MUST be stored on the user's profile record — the same field that today holds the identity provider's picture URL.
- **FR-021**: The stored photo MUST persist across sessions, devices, and application redeploys.
- **FR-022**: When a photo is replaced, the previously stored object MUST be deleted from storage after the profile has been successfully pointed at the new one. A failure to delete the old object MUST NOT fail the user's request nor leave the profile pointing at a missing image.
- **FR-023**: Deleting the old object MUST NOT be attempted for a photo the user did not upload — a picture inherited from the identity provider is not owned by this system and MUST be left alone when it is replaced.

**Removal**

- **FR-023a**: Choosing "Remover imagem" MUST clear the user's profile photo so the Profile page falls back to the initials avatar without a manual reload, and MUST persist that state across reloads and sign-ins.
- **FR-023b**: Removal MUST delete the stored object when the photo was one the user uploaded, and MUST NOT attempt any deletion when the photo was inherited from the identity provider — in that case only the profile's reference is cleared.
- **FR-023c**: While a removal is in progress the system MUST show a loading state and prevent a concurrent upload or a second removal.
- **FR-023d**: On successful removal the system MUST show a success message; on failure it MUST show an error message and leave the current photo intact.
- **FR-023e**: Removal MUST be reachable and operable by keyboard and announced to assistive technology like any other action in the flow.
- **FR-023f**: A removed photo MUST stay removed across sign-out and sign-in, including sign-in with the identity provider that originally supplied a picture. The provider's picture MUST be applied only at account creation and MUST NOT repopulate an empty profile photo afterwards.

**Validation and security**

- **FR-024**: The client MUST validate the selected file's extension and declared MIME type before opening the crop dialog, and MUST reject anything outside the accepted list.
- **FR-025**: The client MUST reject a selected file that cannot be decoded as an image, even when its extension and MIME type look valid.
- **FR-026**: The server MUST independently validate the received image's type and size and MUST NOT trust any client-side validation. A payload that fails server validation MUST be rejected without altering the stored photo.
- **FR-027**: The upload endpoint MUST require an authenticated session, and MUST apply the change only to the authenticated user's own profile — a request MUST NOT be able to set another user's photo.
- **FR-027a** *(deferred — not implemented)*: The request that begins an upload SHOULD be rate-limited per user — approximately **10 requests per 5-minute window**, configurable by environment rather than hardcoded — and over-limit requests rejected without issuing any capability to write to storage. This bounds how much a single authenticated session can write to the bucket, which the per-request validations do not constrain on their own. **Status**: the in-memory limiter shipped with this feature was removed on 2026-08-07; the endpoint currently applies no rate limit and the bound above is unenforced. Deliberately postponed — a per-process counter does not survive a restart or a second instance, so the real fix belongs with the shared store (see research R-013) rather than in this feature.
- **FR-028**: The system MUST enforce a maximum accepted file size on both the client and the server, and the server limit MUST be authoritative.
- **FR-029**: Rejected uploads MUST NOT be persisted anywhere, and error responses MUST NOT expose internal storage paths or infrastructure details.

**Accessibility and responsiveness**

- **FR-030**: The crop dialog MUST be fully operable by keyboard: reachable actions, visible focus, focus trapped inside the dialog while open, focus returned to the avatar control on close, and `Esc` closing the dialog.
- **FR-031**: All controls in the flow — avatar trigger, zoom controls, confirm, cancel — MUST expose descriptive labels to assistive technology, and status changes (uploading, success, error) MUST be announced.
- **FR-032**: Text and controls in the dialog MUST meet the contrast levels already required across the app.
- **FR-033**: The full flow MUST be usable on mobile (from 320px), tablet, and desktop (1280px+) widths, with touch targets of at least 44×44px, including drag-to-reposition and pinch or control-based zoom on touch devices.

### Key Entities

- **Profile Photo**: The single active image representing a user. Belongs to exactly one user; a user has zero or one. Attributes: the location where the image can be retrieved, its **origin** — uploaded through this feature versus inherited from the identity provider — and the moment it was last replaced. Origin is what determines whether the old asset may be deleted on replacement (FR-023).
- **User Profile**: The existing account record already surfaced by the Profile page. Gains no new relationships beyond pointing at the current profile photo, which it already does for photos inherited from the identity provider.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from tapping their avatar to seeing the new photo on screen in under 30 seconds on a typical mobile connection, without instructions.
- **SC-002**: The crop preview responds to dragging and zooming without perceptible lag, including for a 20-megapixel source image.
- **SC-003**: 100% of cancellations — at the file picker or in the crop dialog — leave the stored photo and the displayed avatar unchanged.
- **SC-004**: 100% of rejected files (wrong type, oversized, undecodable) produce a message that names the reason, and the user can select a different file without reloading the page.
- **SC-005**: After a successful save, the new photo appears on the Profile page without a manual reload and survives a full page reload and a new sign-in.
- **SC-006**: No file that fails server-side validation ever becomes a user's stored photo, regardless of what the client sent.
- **SC-007**: Repeated or double confirmations never result in more than one stored photo per attempt.
- **SC-008**: The entire flow can be completed using only the keyboard, and using only a screen reader, with no step that depends on seeing the pointer.
- **SC-009**: The flow is usable end to end at 320px width and at 1280px+ width, with no horizontal scroll or clipped controls.
- **SC-010**: Memory held for the selected image is released after the flow ends — repeating the flow ten times in a session does not accumulate retained image memory.
- **SC-011**: After ten successive photo replacements by one user, the storage bucket holds exactly one object for that user — old objects do not accumulate.
- **SC-012**: Removing a photo returns the initials fallback on the Profile page without a manual reload, survives a reload and a full sign-out/sign-in (including with the identity provider), and leaves no object behind in storage.
- **SC-013**: Both menu actions are reachable and operable by keyboard alone, and "Remover imagem" is unambiguously unavailable for a user with no photo.

## Assumptions

- **Authentication is reused as-is**: only signed-in users reach the Profile page; the existing session mechanism gates the upload endpoint. No new permission model is introduced.
- **Maximum accepted source file size is 5 MB.** This comfortably covers modern phone camera photos while bounding upload time and server memory. The value should be configurable rather than hardcoded.
- **The stored result is a square image of 512×512**, which is more than the largest place the avatar is currently rendered and keeps the stored asset small. A source smaller than that is stored at its own resolution rather than upscaled.
- **Cropping happens on the device before upload**, so the server never receives the original image. This is what makes FR-019 ("stored already cropped") true by construction rather than by a server-side resize step.
- **The storage bucket serves images publicly by URL.** Profile pictures are already public in this product — the identity provider's avatar URL is public today — so no signed-URL or per-request authorization scheme is introduced for reading. Writing remains authenticated and server-side only; the client never receives storage credentials.
- **Stored object names are not guessable from user data** (no raw user id or e-mail as the file name), so a public bucket does not leak the user list.
- **The identity provider writes the profile photo only at account creation.** After that it never overwrites the field again — not when the user has uploaded a photo, and not when the user has removed one and the field is empty. Provider sync is a first-time default, never an ongoing source of truth.
- **Removal clears the photo but does not restore anything** — once removed, the previous image is gone and the user's recourse is to upload again. This follows the original brief's exclusion of photo history.
- **Removal is immediate, with no extra confirmation step.** The action is one menu item away from being redone by uploading again, and an interstitial confirm on a low-stakes avatar change costs more friction than it prevents.
- **Users have intermittent but generally functional connectivity**; a failed upload is treated as retryable rather than as a fatal state.
- **The Profile page is the app's only avatar placement today** — verified against the codebase, where the avatar component is rendered in exactly one file. This feature changes what that placement shows and does not add new ones. Requirements are worded against that reality rather than a hypothetical set of surfaces.
- **Copy is in Brazilian Portuguese**, consistent with the rest of the product.

## Out of Scope

- Image filters, brightness, contrast, saturation, or any adjustment beyond position and zoom.
- Rotation and flipping of the source image.
- Profile photo history, or restoring a previously used photo.
- Uploading more than one image at a time.
- Changing any other profile field (name, weight, height, body fat) from this flow.
- Moderation, face detection, or automatic framing of the uploaded image.
