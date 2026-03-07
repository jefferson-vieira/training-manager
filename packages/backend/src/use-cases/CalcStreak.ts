import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';

import type { Prisma } from '../generated/prisma/client.js';

import { WeekDay } from '../models/enums/WeekDay.js';

interface InputDto {
  completedWorkoutSessions: Prisma.WorkoutSessionGetPayload<{
    select: { startedAt: true };
  }>[];
  fromDate: Dayjs;
  toDate: Dayjs;
  workoutDays: Prisma.WorkoutDayGetPayload<{ select: { weekDay: true } }>[];
}

export class CalcWorkoutStreak {
  execute({
    completedWorkoutSessions,
    fromDate,
    toDate,
    workoutDays,
  }: InputDto) {
    const planWeekDays = new Set(workoutDays.map(({ weekDay }) => weekDay));

    const completedDates = new Set(
      completedWorkoutSessions.map(({ startedAt }) =>
        dayjs(startedAt).format('YYYY-MM-DD'),
      ),
    );

    let streak = 0;

    let day = toDate.clone();

    const streakRange = toDate.diff(fromDate, 'day');

    for (let i = 0; i < streakRange; i++) {
      const weekDay = WeekDay[day.day()];

      if (!planWeekDays.has(weekDay)) {
        day = day.subtract(1, 'day');

        continue;
      }

      if (completedDates.has(day.format('YYYY-MM-DD'))) {
        streak++;

        day = day.subtract(1, 'day');

        continue;
      }

      streak = 0;

      break;
    }

    return streak;
  }
}
