import type { Prisma } from '../../generated/prisma/client.js';

import { RebuildWorkoutStreak } from './RebuildWorkoutStreak.js';
import {
  buildPlanSchedule,
  hasMissedScheduledDay,
  toStreakDay,
} from './WorkoutStreakRules.js';

interface InputDto {
  client: Prisma.TransactionClient;
  startedAt: Date;
  userId: string;
}

/**
 * Advances the materialized streak for a workout that has just been completed.
 * Runs inside the completion transaction, so it must never be called outside one.
 */
export class ApplyWorkoutCompletionToStreak {
  async execute({ client, startedAt, userId }: InputDto) {
    // Serialize concurrent completions for this user: create the row if absent,
    // then hold it until commit so a second completion sees our updated state
    // instead of the same pre-state.
    await client.$executeRaw`
      INSERT INTO workout_streak (user_id, current_streak, longest_streak, created_at, updated_at)
      VALUES (${userId}, 0, 0, now(), now())
      ON CONFLICT (user_id) DO NOTHING
    `;

    await client.$queryRaw`
      SELECT user_id FROM workout_streak WHERE user_id = ${userId} FOR UPDATE
    `;

    const streak = await client.workoutStreak.findUniqueOrThrow({
      select: {
        currentStreak: true,
        lastWorkoutDay: true,
        longestStreak: true,
      },
      where: {
        userId,
      },
    });

    const day = toStreakDay(startedAt);

    const lastWorkoutDay = streak.lastWorkoutDay
      ? toStreakDay(streak.lastWorkoutDay)
      : null;

    if (lastWorkoutDay && day === lastWorkoutDay) {
      return;
    }

    // The workout fills a day at or before the last counted one, so history
    // changed in the past and the forward-only increment cannot express it.
    if (lastWorkoutDay && day < lastWorkoutDay) {
      await new RebuildWorkoutStreak().execute({
        client,
        userId,
      });

      return;
    }

    const workoutPlans = await client.workoutPlan.findMany({
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
    });

    const isContinuation =
      lastWorkoutDay !== null &&
      !hasMissedScheduledDay({
        afterDay: lastWorkoutDay,
        completedDays: new Set([day, lastWorkoutDay]),
        schedule: buildPlanSchedule(workoutPlans),
        throughDay: day,
      });

    const currentStreak = isContinuation ? streak.currentStreak + 1 : 1;

    await client.workoutStreak.update({
      data: {
        currentStreak,
        lastWorkoutDay: new Date(`${day}T00:00:00.000Z`),
        longestStreak: Math.max(streak.longestStreak, currentStreak),
      },
      where: {
        userId,
      },
    });
  }
}
