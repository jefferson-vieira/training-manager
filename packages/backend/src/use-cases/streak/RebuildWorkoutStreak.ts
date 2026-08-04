import dayjs from 'dayjs';

import type { Prisma } from '../../generated/prisma/client.js';

import {
  buildPlanSchedule,
  hasMissedScheduledDay,
  toStreakDay,
} from './WorkoutStreakRules.js';

interface InputDto {
  client: Prisma.TransactionClient;
  userId: string;
}

/**
 * Recomputes the materialized streak from history. This is the definition of
 * the derivation — the incremental path is an optimization that must agree
 * with it, and this wins whenever they diverge.
 */
export class RebuildWorkoutStreak {
  async execute({ client, userId }: InputDto) {
    const [completedSessions, workoutPlans] = await Promise.all([
      client.workoutSession.findMany({
        orderBy: {
          startedAt: 'asc',
        },
        select: {
          startedAt: true,
        },
        where: {
          completedAt: {
            not: null,
          },
          workoutDay: {
            workoutPlan: {
              userId,
            },
          },
        },
      }),
      client.workoutPlan.findMany({
        select: {
          createdAt: true,
          workoutDays: {
            select: {
              isRest: true,
              weekDay: true,
            },
          },
        },
        where: {
          userId,
        },
      }),
    ]);

    // Iteration order below relies on this Set being fed in ascending day order,
    // which the query's orderBy guarantees.
    const completedDays = new Set(
      completedSessions.map(({ startedAt }) => toStreakDay(startedAt)),
    );

    const schedule = buildPlanSchedule(workoutPlans);

    let currentStreak = 0;

    let longestStreak = 0;

    let previousDay: null | string = null;

    for (const day of completedDays) {
      const isContinuation =
        previousDay !== null &&
        !hasMissedScheduledDay({
          afterDay: previousDay,
          completedDays,
          schedule,
          throughDay: day,
        });

      currentStreak = isContinuation ? currentStreak + 1 : 1;

      longestStreak = Math.max(longestStreak, currentStreak);

      previousDay = day;
    }

    // The run above is what the user reached on their last workout day. It only
    // survives to now if no scheduled day has elapsed unworked since — without
    // this the rebuild would return a value the next read would immediately reset.
    if (previousDay !== null) {
      const expired = hasMissedScheduledDay({
        afterDay: previousDay,
        completedDays,
        schedule,
        throughDay: dayjs.utc().format('YYYY-MM-DD'),
      });

      if (expired) {
        currentStreak = 0;
      }
    }

    const lastWorkoutDay = previousDay ? dayjs.utc(previousDay).toDate() : null;

    await client.workoutStreak.upsert({
      create: {
        currentStreak,
        lastWorkoutDay,
        longestStreak,
        userId,
      },
      update: {
        currentStreak,
        lastWorkoutDay,
        longestStreak,
      },
      where: {
        userId,
      },
    });
  }
}
