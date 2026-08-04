# Release Notes: Recorde de Sequência de Treinos

**Feature**: [spec.md](./spec.md) | **Date**: 2026-08-03

## User-facing change

The Stats screen now shows an all-time record badge — `🏆 RECORDE: N DIAS` — inside the streak banner, below "Sequência Atual". It is hidden for users who have never completed a workout.

## ⚠️ Required release step

**Seed `workout_streak` before enabling the feature**, with the backend deployed and the migration applied. There is no backfill script — the table is populated manually.

This is a gate, not an optimization. The read path deliberately never rebuilds from history, so until the table is seeded **every existing user reads a zero current streak and a zero record on both Home and Stats**.

## Expected behavior changes (not regressions)

Support and QA should expect these. All three are deliberate corrections documented in FR-019.

| Change | Who notices | Why |
|---|---|---|
| **Home's streak number rises** | Any user past a 7-day streak | Home previously computed the streak over a one-week window, capping it at the days elapsed that week. Both screens now read one shared value, so Home and Stats always agree. |
| **Stats streaks past ~6 months rise** | Long-streak users | The old calculation was bounded by the query window and silently truncated anything longer. |
| **Day attribution is now UTC** | Users training near the UTC boundary | Day boundaries previously depended on the server process's timezone. A workout is now dated by the UTC day it *started*. For a user at UTC-3, a session begun after 21:00 local counts toward the next day. |

The streak **rule** is unchanged: rest days still do not break a streak, the plan active on each past day still governs it, and the current day never breaks a streak until it has ended.

## Rollback

The change is additive at the database level (one new table, `workout_streak`). Reverting the application code restores the previous read-time calculation; the table can be left in place or dropped separately.
