import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday.js';

import type { Prisma } from '../generated/prisma/client.js';

import { WeekDay } from '../models/enums/WeekDay.js';

dayjs.extend(isToday);

interface InputDto {
  completedWorkoutSessions: Pick<Prisma.WorkoutSessionModel, 'startedAt'>[];
  fromDate: Dayjs;
  toDate: Dayjs;
  workoutDays: Pick<Prisma.WorkoutDayModel, 'isRest' | 'weekDay'>[];
}

export class CalcWorkoutStreak {
  execute({
    completedWorkoutSessions,
    fromDate,
    toDate,
    workoutDays,
  }: InputDto) {
    const planWeekDays = new Set(
      workoutDays.filter(({ isRest }) => !isRest).map(({ weekDay }) => weekDay),
    );

    const completedDates = new Set(
      completedWorkoutSessions.map(({ startedAt }) =>
        dayjs(startedAt).format('YYYY-MM-DD'),
      ),
    );

    let streak = 0;

    let day = toDate.clone();

    const streakRange = toDate.diff(fromDate, 'day');

    for (let i = 0; i < streakRange; i++, day = day.subtract(1, 'day')) {
      const weekDay = WeekDay[day.day()];

      if (!planWeekDays.has(weekDay)) {
        continue;
      }

      if (completedDates.has(day.format('YYYY-MM-DD'))) {
        streak++;

        continue;
      }

      if (day.isToday()) {
        continue;
      }

      break;
    }

    return streak;
  }
}
