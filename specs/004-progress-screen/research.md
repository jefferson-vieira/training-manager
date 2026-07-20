# Phase 0 Research: Progress Screen

All items resolved. No `NEEDS CLARIFICATION` remain.

## R1 — API contract already available in the generated client

- **Decision**: Consume the existing `getApiStats(params)` from
  `packages/web/src/lib/api/fetch-generated/index.ts`. No backend change, no
  `npx orval` regeneration.
- **Rationale**: The route is mounted at `/api/stats` (`routes/index.ts`) and the
  generated client already exports `getApiStats`, `GetApiStatsParams` (`from`,
  `to` ISO dates), and `GetApiStats200` (`completedWorkoutsCount`,
  `conclusionRate` 0–1, `consistencyByDay`, `totalTimeInSeconds`, `workoutStreak`).
- **Alternatives considered**: Regenerating Orval — unnecessary, the contract is
  unchanged; adding a bespoke fetch — violates the "no parallel DTOs" rule.

## R2 — Six-month range aligned to full weeks

- **Decision**: Compute server-side with `dayjs`: `to` = Saturday of the current
  week; `from` = Sunday of the week six months before today. Pass both as
  `YYYY-MM-DD` to `getApiStats`. The grid iterates full Sun–Sat weeks between them.
- **Rationale**: Clarification session fixed full-week columns (~26 columns).
  Aligning the query to the grid avoids partial edge columns needing special data
  handling; out-of-range days simply never appear because the range starts/ends on
  week boundaries.
- **Alternatives considered**: Exact 6 calendar months (rejected in clarify —
  produced partial columns).

## R3 — Consistency grid layout, month labels, and reuse

- **Decision**: New `"use client"` `ConsistencyGrid`. Build a pure function that
  returns an array of week-columns, each a 7-length array of `dayjs` dates
  (Sun→Sat). Render as CSS grid / flex columns. Month label shows only on a column
  whose **first in-range day introduces a new month** vs. the previous column.
  Reuse the existing home `ConsistencySquare` for cell colors (completed →
  `bg-primary`, started → `bg-primary/20`, none/rest/out-of-range → bordered
  white). Colocate the builder function beside the component (mirrors the existing
  colocated `getWeekDates` in `consistency-tracker.tsx`).
- **Rationale**: Matches existing color semantics and file conventions; keeps
  business logic (date math) out of JSX as a pure, manually verifiable function.
- **Alternatives considered**: A generic calendar library — rejected (new
  dependency, over-scoped). Reworking the home `ConsistencyTracker` to be generic —
  deferred; its weekly single-row shape differs from the month grid.

## R4 — Tooltip on hover AND tap (DD/MM)

- **Decision**: Use shadcn `Tooltip` (`components/ui/tooltip.tsx`, Radix-based)
  wrapping each cell; content = `date.format('DD/MM')`. For touch, make the cell a
  focusable/pressable trigger so tap opens the tooltip (Radix opens on focus).
  Wrap the grid in a single `TooltipProvider` with a short delay.
- **Rationale**: Reuses an installed primitive; satisfies both pointer hover and
  touch activation without custom popover logic.
- **Alternatives considered**: `HoverCard` (exists but hover-only, no tap);
  bespoke click-to-toggle popover (more code, redundant with Tooltip). If manual
  verification shows tap does not reliably open on the target device, fall back to
  controlled open state toggled on cell click.

## R5 — Streak banner variants and design token

- **Decision**: `StreakBanner` renders two visual variants keyed on
  `streak > 0` (colored when 1 or more, neutral at 0). Extract exact colors, spacing, and iconography from the Figma
  frames (colored `3606-216`, neutral `3606-414`) during implementation via the
  Figma MCP. Add `--streak` / `--streak-foreground` design tokens to `globals.css`
  if the colored variant needs a dedicated color — this also resolves the home
  page's currently-undefined `bg-streak`/`text-streak-foreground` classes.
- **Rationale**: Faithful-to-Figma is a hard requirement (FR-014); the streak
  color is a reusable brand token, so it belongs in `globals.css`, not inline.
- **Alternatives considered**: Hardcoding hex/oklch inline — violates UX
  Consistency (no hardcoded colors when a token fits).

## R6 — Formatting helpers

- **Decision**: Add to `lib/format.ts` (precedent: it already holds
  `formatWeight`, `formatBodyFat`, etc.):
  - `formatCompletionRate(rate: number)` → whole-number percent, e.g. `0.83 → "83%"`.
  - `formatTotalTime(seconds: number)` → `NNhNNm` with zero-padded minutes and
    unbounded hours, e.g. `416400 → "115h40m"`, `0 → "0h00m"`.
- **Rationale**: Consistent with the existing domain-formatting module; keeps
  display logic out of components.
- **Alternatives considered**: `helpers/` — the constitution reserves `helpers/`
  for business rules, but unit/display formatting already lives in `lib/format.ts`;
  following existing precedent avoids fragmenting the same concern.
- **Open display detail (low impact)**: Completion-rate precision defaults to whole
  numbers; confirm against Figma during implementation and switch to one decimal
  only if the design shows it.

## R7 — StatCard reuse

- **Decision**: Promote `StatCard` from `app/(main)/profile/_components/stat-card.tsx`
  to `components/stat-card.tsx`; update the profile import. Use it for the three
  progress metrics (icon + value + unit).
- **Rationale**: Now shared by two routes; constitution requires reuse over
  duplication. `StatCard`'s icon/value/unit shape fits the metrics directly.
- **Alternatives considered**: Duplicating the card in progress `_components` —
  rejected (duplication). Leaving it in profile and importing across route folders —
  rejected (crosses colocation boundaries).
