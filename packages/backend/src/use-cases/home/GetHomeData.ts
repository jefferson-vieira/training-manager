import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

import type { Prisma } from '../../generated/prisma/client.js';
import type { HomeSchema } from './../../schemas/HomeSchema.js';

import { prisma } from '../../lib/db.js';
import { WeekDay } from '../../models/enums/WeekDay.js';

dayjs.extend(utc);

interface InputDto {
  userId: string;
}

export class GetHomeData {
  async execute(dto: InputDto) {
    const currentDate = dayjs.utc();

    const workoutPlan = await prisma.workoutPlan.findFirst({
      include: {
        workoutDays: {
          include: {
            exercises: true,
            sessions: true,
          },
        },
      },
      where: {
        isActive: true,
        userId: dto.userId,
      },
    });

    const todayWorkoutDay = workoutPlan?.workoutDays.find(
      ({ weekDay }) => weekDay === WeekDay[currentDate.day()],
    );

    const weekStart = currentDate.day(0).startOf('day');

    const weekEnd = currentDate.day(6).endOf('day');

    const weekSessions = await prisma.workoutSession.findMany({
      where: {
        startedAt: {
          gte: weekStart.toDate(),
          lte: weekEnd.toDate(),
        },
        workoutDay: {
          workoutPlanId: workoutPlan?.id,
        },
      },
    });

    const consistencyByDay: HomeSchema['consistencyByDay'] = {};

    for (let i = WeekDay.SUNDAY; i <= WeekDay.SATURDAY; i++) {
      const day = weekStart.add(i, 'day');

      const dateKey = day.format('YYYY-MM-DD');

      const daySessions = weekSessions.filter(({ startedAt }) =>
        dayjs.utc(startedAt).isSame(day, 'date'),
      );

      const workoutDayStarted = daySessions.length > 0;

      const workoutDayCompleted = daySessions.some(
        ({ completedAt }) => completedAt,
      );

      consistencyByDay[dateKey] = {
        workoutDayCompleted,
        workoutDayStarted,
      };
    }

    let workoutStreak = 0;

    if (workoutPlan) {
      workoutStreak = await this.calcStreak(
        workoutPlan.id,
        workoutPlan.workoutDays,
        currentDate,
      );
    }

    return {
      activeWorkoutPlanId: workoutPlan?.id,
      consistencyByDay,
      todayWorkoutDay: todayWorkoutDay &&
        workoutPlan && {
          coverImageUrl: todayWorkoutDay.coverImageUrl,
          estimatedDurationInSeconds:
            todayWorkoutDay.estimatedDurationInSeconds,
          exercisesCount: todayWorkoutDay.exercises.length,
          id: todayWorkoutDay.id,
          isRest: todayWorkoutDay.isRest,
          name: todayWorkoutDay.name,
          weekDay: todayWorkoutDay.weekDay,
          workoutPlanId: workoutPlan.id,
        },
      workoutStreak,
    };
  }

  private async calcStreak(
    workoutPlanId: string,
    workoutDays: Array<Prisma.WorkoutDayGetPayload<true>>,
    currentDate: Dayjs,
  ) {
    const planWeekDays = new Set(workoutDays.map(({ weekDay }) => weekDay));

    const restWeekDays = new Set(
      workoutDays.filter(({ isRest }) => isRest).map(({ weekDay }) => weekDay),
    );

    const completedSessions = await prisma.workoutSession.findMany({
      select: {
        startedAt: true,
      },
      where: {
        completedAt: {
          not: null,
        },
        workoutDay: {
          workoutPlanId,
        },
      },
    });

    const completedDates = new Set(
      completedSessions.map(({ startedAt }) =>
        dayjs.utc(startedAt).format('YYYY-MM-DD'),
      ),
    );

    let streak = 0;

    let day = currentDate.clone();

    for (let i = 0; i < 365; i++) {
      const weekDay = WeekDay[day.day()];

      if (!planWeekDays.has(weekDay)) {
        day = day.subtract(1, 'day');
        continue;
      }

      if (restWeekDays.has(weekDay)) {
        streak++;
        day = day.subtract(1, 'day');
        continue;
      }

      if (completedDates.has(day.format('YYYY-MM-DD'))) {
        streak++;
        day = day.subtract(1, 'day');
        continue;
      }
      break;
    }

    return streak;
  }
}
