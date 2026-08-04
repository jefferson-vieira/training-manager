# Specification Quality Checklist: Recorde de Sequência de Treinos

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-03
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Resolved 2026-08-03**: The streak continuity rule conflict (strict consecutive days per the supplied architecture doc vs. the plan-aware rule shipped in `CalcWorkoutStreak`) was settled in favour of the **plan-aware rule**. Consequence for planning: the materialized state cannot be maintained with pure date arithmetic — both the completion-time update (FR-012) and the on-demand validation (FR-014) must consult the plan schedule that was active across the gap (FR-008a).
- Two other ambiguities were resolved with documented defaults rather than blocking: local-calendar-day boundary, and the badge's behaviour when the record is 0.
- **Revised 2026-08-04**: the record badge is now shown unconditionally, including `RECORDE: 0 DIAS`. FR-004 previously required hiding it at 0; spec.md, quickstart.md case 2.3, contracts/api-changes.md and tasks.md T015 were updated together.
- **Note for `/speckit-plan`**: the current streak is already computed and displayed today (`use-cases/CalcStreak.ts`, `stats/_components/streak-banner.tsx`). This feature adds the record *and* migrates the existing read-time calculation to a materialized state — FR-019 requires the displayed current streak stay identical for unchanged history, which is the main regression risk.
- Constitution compliance: no automated-test tasks or test infrastructure appear anywhere in this spec, per Principle I.
