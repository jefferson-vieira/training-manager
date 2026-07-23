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
  workoutPlans: WorkoutPlanDto[];
}

interface WorkoutPlanDto extends Pick<Prisma.WorkoutPlanModel, 'createdAt'> {
  workoutDays: Pick<Prisma.WorkoutDayModel, 'isRest' | 'weekDay'>[];
}

export class CalcWorkoutStreak {
  execute({
    completedWorkoutSessions,
    fromDate,
    toDate,
    workoutPlans,
  }: InputDto) {
    const plansByRecency = workoutPlans
      .map(({ createdAt, workoutDays }) => ({
        createdAt: dayjs(createdAt),
        weekDays: new Set(
          workoutDays
            .filter(({ isRest }) => !isRest)
            .map(({ weekDay }) => weekDay),
        ),
      }))
      .sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf());

    const completedDates = new Set(
      completedWorkoutSessions.map(({ startedAt }) =>
        dayjs(startedAt).format('YYYY-MM-DD'),
      ),
    );

    let streak = 0;

    let day = toDate.clone();

    const streakRange = toDate.diff(fromDate, 'day');

    for (let i = 0; i < streakRange; i++, day = day.subtract(1, 'day')) {
      if (completedDates.has(day.format('YYYY-MM-DD'))) {
        streak++;

        continue;
      }

      // The plan in effect on a past day is the latest one created by then
      const plan = plansByRecency.find(
        ({ createdAt }) => !createdAt.isAfter(day, 'day'),
      );

      if (!plan) {
        break;
      }

      const weekDay = WeekDay[day.day()];

      if (!plan.weekDays.has(weekDay)) {
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
