# Feature Specification: User Profile Screen

**Feature Branch**: `001-user-profile`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "tela de perfil do usuário - crie a tela em https://www.figma.com/design/Vdvl7fFXQ4TH0ktjwhr7dK/FIT.AI--Alunos---Copy-?node-id=3606-608. Essa tela é a feature que exibe as informações do usuário obtidas no onboarding. Os dados são: peso; altura; percentual gordura corporal; idade. Por enquanto os dados são somente visualização. O botão 'sair da conta' deve fazer logout. No menu de nav inferior o botão com o ícone de 'user round' deve levar para essa tela quando clicado."

## Clarifications

### Session 2026-07-13

- Q: What condition triggers the redirect to onboarding? → A: User has no registered profile / has not completed onboarding (same signal the home flow already uses).
- Q: When should the "no profile" check happen, and does the user ever briefly see the profile screen? → A: Check before the screen renders and redirect immediately — user never sees an empty profile screen.

## User Scenarios *(mandatory)*

### User Story 1 - View my profile information (Priority: P1)

An authenticated user opens the profile screen and sees the personal information
they provided during onboarding: weight, height, body fat percentage, and age.
The information is presented for viewing only — there is no editing in this
release.

**Why this priority**: This is the core value of the feature. Being able to see
the data captured at onboarding gives the user confidence that their profile is
correct and gives every subsequent capability (editing, insights) something to
build on. It is a viable, demonstrable slice on its own.

**Independent Verification**: With a logged-in user who completed onboarding,
open the profile screen and confirm the four values (weight, height, body fat
percentage, age) are displayed and match the onboarding data. Delivers value by
letting the user review their stored profile.

**Acceptance Scenarios**:

1. **Given** an authenticated user who completed onboarding, **When** they open the profile screen, **Then** their weight, height, body fat percentage, and age are displayed with clear labels.
2. **Given** the profile screen is open, **When** the user attempts to change a displayed value, **Then** no field is editable (values are read-only in this release).
3. **Given** an authenticated user, **When** the profile screen loads, **Then** each value is shown in a human-readable format and unit consistent with the rest of the app.
4. **Given** an authenticated user who has no registered profile / has not completed onboarding, **When** they attempt to open the profile screen, **Then** they are redirected to the onboarding flow before the profile screen renders (no empty profile screen is shown).

---

### User Story 2 - Reach the profile from the bottom navigation (Priority: P1)

From anywhere the bottom navigation menu is shown, the user taps the "user round"
icon and is taken to the profile screen.

**Why this priority**: Without a navigation entry point, the profile screen is
unreachable in normal use. It is required for the feature to be usable and is
tightly coupled to Story 1 as the way users discover it.

**Independent Verification**: With the app open on a screen that shows the bottom
navigation, tap the "user round" icon and confirm the profile screen opens.

**Acceptance Scenarios**:

1. **Given** the bottom navigation is visible, **When** the user taps the "user round" icon, **Then** the profile screen opens.
2. **Given** the user is already on the profile screen, **When** they look at the bottom navigation, **Then** the "user round" item is indicated as the active/current destination.

---

### User Story 3 - Log out from the profile (Priority: P2)

On the profile screen the user taps the "Sair da conta" (log out) button and is
signed out of the application, ending their session.

**Why this priority**: Logging out is important for account safety, especially on
shared devices, but the screen still delivers value (viewing data) without it, so
it ranks just below the core view and navigation stories.

**Independent Verification**: While logged in, open the profile screen, tap "Sair
da conta", and confirm the session ends and the user is returned to the
unauthenticated entry point (login).

**Acceptance Scenarios**:

1. **Given** an authenticated user on the profile screen, **When** they tap "Sair da conta", **Then** their session is terminated.
2. **Given** the user has logged out, **When** the log-out completes, **Then** they are taken to the login screen.
3. **Given** the user has logged out, **When** they try to return to a protected screen, **Then** they are prevented from accessing it and directed to log in again.

---

### Edge Cases

- What happens when the user has no registered profile / has not completed onboarding? The user MUST be redirected to the onboarding flow instead of seeing the profile screen, using the same signal the home flow already uses to route users without an active profile.
- What happens when a profile value from onboarding is missing or was never provided (but the profile itself exists)? The screen should show a clear placeholder/empty indication rather than a blank or broken value.
- What happens if log-out fails (e.g., network issue)? The user should receive clear feedback and remain able to retry, not be left in an ambiguous state.
- How is the screen presented on small (320px) versus large (1280px+) widths without clipping, overflow, or horizontal scroll?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a profile screen accessible only to authenticated users.
- **FR-002**: The profile screen MUST display the user's weight captured during onboarding.
- **FR-003**: The profile screen MUST display the user's height captured during onboarding.
- **FR-004**: The profile screen MUST display the user's body fat percentage captured during onboarding.
- **FR-005**: The profile screen MUST display the user's age.
- **FR-006**: All displayed profile values MUST be read-only in this release; the screen MUST NOT offer any editing controls for these values.
- **FR-007**: Each value MUST be shown with a descriptive label and in a human-readable format/unit consistent with the rest of the application.
- **FR-008**: The bottom navigation "user round" icon MUST navigate the user to the profile screen when activated.
- **FR-009**: The bottom navigation MUST indicate the profile item as active when the profile screen is the current destination.
- **FR-010**: The profile screen MUST provide a "Sair da conta" (log out) button.
- **FR-011**: Activating "Sair da conta" MUST end the user's authenticated session.
- **FR-012**: After a successful log out, the user MUST be taken to the login screen and prevented from accessing protected screens until re-authenticated.
- **FR-013**: When the user has no registered profile / has not completed onboarding, the system MUST redirect the user to the onboarding flow instead of rendering the profile screen, using the same signal the home flow uses to detect users without an active profile. The check MUST occur before the screen renders so the user never sees an empty profile screen.
- **FR-014**: When the profile exists but an individual value is unavailable, the screen MUST present a clear empty/placeholder state for that value instead of a broken or blank value.
- **FR-015**: The profile screen MUST match the referenced Figma design and remain usable and correctly laid out on mobile (320px) and desktop (1280px+) widths.

### Key Entities *(include if feature involves data)*

- **User Profile**: The set of personal measurements a user provided during onboarding that this screen displays — weight, height, body fat percentage, and age — associated with the authenticated user. Read-only from this screen's perspective in this release.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A logged-in user who completed onboarding can view all four profile values (weight, height, body fat percentage, age) on the profile screen without any additional action beyond opening it.
- **SC-002**: A user can reach the profile screen from the bottom navigation in a single tap on the "user round" icon.
- **SC-003**: The displayed values match the data the user entered at onboarding in 100% of verified cases.
- **SC-004**: A user can log out from the profile screen and reach the login screen in a single action, and can no longer open protected screens afterward.
- **SC-005**: The profile screen renders without overflow, clipping, or horizontal scroll at 320px and 1280px widths, and visually matches the referenced Figma design.
- **SC-006**: The profile screen opens and becomes interactive without perceptible lag under normal local/dev conditions.

## Assumptions

- The measurements shown are those already collected during the existing onboarding flow; no new data collection is introduced by this feature.
- Age is derived from data already available for the user (e.g., captured at onboarding); no new prompt for age is added by this screen.
- Value formatting follows the app's existing conventions (the domain stores weight in grams, height in centimeters, and body fat on a 0–1000 scale where 40% = 400); the screen presents these in the user-facing units used elsewhere in the app.
- Authentication, session management, and log-out rely on the existing auth mechanism; this feature does not introduce a new auth method.
- Route protection for the new screen reuses the app's existing protection pattern, consistent with other authenticated screens.
- The "no registered profile" redirect reuses the same detection signal as the existing home flow (which routes users without an active profile to onboarding); this feature does not introduce a new profile-existence check.
- The bottom navigation component already exists; this feature wires the "user round" item to the new destination rather than introducing a new navigation system.
- Editing of profile values is explicitly out of scope for this release (view-only).
- The referenced Figma node (`3606-608`) is the visual source of truth for layout, spacing, and typography.
