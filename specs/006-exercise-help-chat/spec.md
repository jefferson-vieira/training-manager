# Feature Specification: Exercise Help via Coach AI

**Feature Branch**: `006-exercise-help-chat`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "ajuda com exercício - na tela dia de treino, na lista de exercícios, implemente o botão de 'Ajuda sobre o exercício'. O botão deve abrir o chatbot e enviar a seguinte mensagem: 'Como executar o exercício <nome do exercício correspondente> corretamente?'"

## User Scenarios *(mandatory)*

### User Story 1 - Get help executing an exercise (Priority: P1)

While viewing a workout day, a user is unsure how to perform one of the listed
exercises correctly. Each exercise row has a help control. When the user taps it,
the Coach AI opens and immediately asks — on the user's behalf — how to correctly
execute that specific exercise, so the user gets guidance without typing anything.

**Why this priority**: This is the entire feature. It removes friction between
seeing an exercise the user doesn't know and getting coaching on its execution,
directly at the moment of need (during or before a workout).

**Independent Verification**: Open a workout day with at least one exercise, tap
the help control on a given exercise, and confirm the Coach AI opens with a
message asking how to correctly execute that exact exercise, followed by the
coach's streamed answer.

**Acceptance Scenarios**:

1. **Given** a workout day showing an exercise named "Supino reto", **When** the user taps that exercise's help control, **Then** the Coach AI opens and a message reading "Como executar o exercício Supino reto corretamente?" is sent as if the user had written it.
2. **Given** the help message was sent, **When** the Coach AI responds, **Then** the user sees the coach's answer streamed in the same conversation.
3. **Given** a workout day with multiple exercises, **When** the user taps the help control on the second exercise, **Then** the sent message references the second exercise's name, not any other exercise.
4. **Given** the Coach AI was opened via an exercise help control and the user closes it, **When** the user taps the help control on a different exercise, **Then** the Coach AI opens and asks about that different exercise.

---

### Edge Cases

- What happens when the exercise name contains special characters, accents, or extra whitespace? The name MUST be sent exactly as displayed for that exercise.
- What happens if the Coach AI already has a prior conversation? The help question is appended to that existing conversation; prior messages are preserved (the overlay keeps conversation state across close/open).
- What happens if the Coach AI is already open when the help control is tapped? The help question for the selected exercise MUST still be submitted into the conversation.
- What happens if the AI request fails or the network is unavailable? The user MUST see the existing Coach AI error/failure feedback, consistent with manually sent messages — no separate error path is introduced by this feature.
- What happens on very long exercise names? The message MUST include the full name without truncation.

## Clarifications

### Session 2026-07-22

- Q: When a user taps an exercise's help control, how should the help question relate to any prior Coach AI conversation? → A: Continue the existing thread — the Coach AI conversation is preserved across close/open today, so the help question is appended to whatever conversation already exists, preserving prior context.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each exercise in the workout day exercise list MUST expose a help control labeled for assistance about that exercise.
- **FR-002**: Activating an exercise's help control MUST open the Coach AI overlay if it is not already open.
- **FR-003**: Activating the help control MUST submit the message "Como executar o exercício <exercise name> corretamente?" into the Coach AI conversation as a user message, where `<exercise name>` is the name of the exercise whose control was activated.
- **FR-004**: The submitted message MUST use the exercise name exactly as shown to the user for that row.
- **FR-005**: After the message is submitted, the Coach AI MUST process and respond to it using the same behavior as a manually typed message (streamed answer, same tools, same error handling).
- **FR-006**: The help control MUST reference only the exercise it belongs to; activating it MUST never send a question about a different exercise.
- **FR-007**: The help control MUST be reachable and operable on mobile (320px+) and desktop (1280px+), with a touch target of at least 44×44px, consistent with existing interactive controls.
- **FR-008**: The feature MUST reuse the existing global Coach AI overlay and its message-sending behavior; it MUST NOT introduce a separate chat surface or duplicate conversation.
- **FR-009**: The help question MUST be appended to the existing Coach AI conversation, preserving any prior messages; it MUST NOT reset or clear the conversation. The overlay's current behavior of preserving the conversation across close/open MUST be retained.

### Key Entities *(include if feature involves data)*

- **Exercise**: An item in a workout day's exercise list. The only attribute this feature relies on is the exercise **name**, used verbatim to compose the help question.
- **Coach AI conversation**: The existing global assistant conversation into which the help question is submitted and where the response appears.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From tapping an exercise's help control, the Coach AI is open and the correctly-named help question is visible in the conversation in under 2 seconds (excluding AI response time).
- **SC-002**: In 100% of attempts, the sent question names the exact exercise whose control was tapped.
- **SC-003**: Users can request help for an exercise without typing any text (zero keystrokes required to ask the question).
- **SC-004**: The help control is operable at both 320px and 1280px widths with no clipped content or horizontal scroll.

## Assumptions

- The Coach AI overlay reachable from the workout day screen is the existing global assistant (`components/chat.tsx`); this feature wires the help control into that same overlay rather than creating a new one.
- The Coach AI conversation is already preserved across close/open; the help question continues that same thread and this persistence behavior is retained.
- The prewritten question is fixed Portuguese copy — "Como executar o exercício <nome> corretamente?" — matching the product's language, and only the exercise name is dynamic.
- The exercise name available in the workout day data is the appropriate, user-facing name to embed in the question.
- No backend or API contract change is required; the existing `/api/ai` streaming behavior handles the question unchanged.
- Response quality and content are owned by the Coach AI system prompt and are out of scope for this feature.
