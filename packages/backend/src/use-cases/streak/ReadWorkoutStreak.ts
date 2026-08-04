import dayjs from 'dayjs';

import { prisma } from '../../lib/db.js';
import {
  buildPlanSchedule,
  hasMissedScheduledDay,
  toStreakDay,
} from './WorkoutStreakRules.js';

interface InputDto {
  userId: string;
}

export class ReadWorkoutStreak {
  async execute({ userId }: InputDto) {
    const streak = await prisma.workoutStreak.findUnique({
      select: {
        currentStreak: true,
        lastWorkoutDay: true,
        longestStreak: true,
      },
      where: {
        userId,
      },
    });

    if (!streak) {
      return {
        currentStreak: 0,
        longestStreak: 0,
      };
    }

    if (streak.currentStreak === 0 || !streak.lastWorkoutDay) {
      return {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
      };
    }

    const workoutPlans = await prisma.workoutPlan.findMany({
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

    const lastWorkoutDay = toStreakDay(streak.lastWorkoutDay);

    const expired = hasMissedScheduledDay({
      afterDay: lastWorkoutDay,
      completedDays: new Set([lastWorkoutDay]),
      schedule: buildPlanSchedule(workoutPlans),
      throughDay: dayjs.utc().format('YYYY-MM-DD'),
    });

    if (!expired) {
      return {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
      };
    }

    await prisma.workoutStreak.update({
      data: {
        currentStreak: 0,
      },
      where: {
        userId,
      },
    });

    return {
      currentStreak: 0,
      longestStreak: streak.longestStreak,
    };
  }
}
