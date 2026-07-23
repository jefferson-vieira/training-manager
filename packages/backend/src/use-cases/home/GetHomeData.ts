import dayjs from 'dayjs';

import type { HomeSchema } from './../../schemas/HomeSchema.js';

import { NotFoundError } from '../../errors/NotFoundError.js';
import { prisma } from '../../lib/db.js';
import { WeekDay } from '../../models/enums/WeekDay.js';
import { CalcWorkoutStreak } from '../CalcStreak.js';

interface InputDto {
  userId: string;
}

export class GetHomeData {
  async execute(dto: InputDto) {
    const today = dayjs();

    const workoutPlans = await prisma.workoutPlan.findMany({
      include: {
        workoutDays: {
          include: {
            _count: {
              select: {
                exercises: true,
              },
            },
          },
        },
      },
      where: {
        userId: dto.userId,
      },
    });

    const workoutPlan = workoutPlans.find(({ isActive }) => isActive);

    if (!workoutPlan) {
      throw new NotFoundError('Active workout plan not found');
    }

    const weekStart = today.startOf('week');

    const weekEnd = today.endOf('week');

    const weekSessions = await prisma.workoutSession.findMany({
      select: {
        completedAt: true,
        startedAt: true,
      },
      where: {
        startedAt: {
          gte: weekStart.toDate(),
          lte: weekEnd.toDate(),
        },
        workoutDay: {
          workoutPlan: {
            userId: dto.userId,
          },
        },
      },
    });

    const consistencyByDay: HomeSchema['consistencyByDay'] = {};

    for (let i = WeekDay.SUNDAY; i <= WeekDay.SATURDAY; i++) {
      const day = weekStart.add(i, 'day');

      const dateKey = day.format('YYYY-MM-DD');

      const daySessions = weekSessions.filter(({ startedAt }) =>
        dayjs(startedAt).isSame(day, 'date'),
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

    const completedWorkoutSessions = weekSessions.filter(
      ({ completedAt }) => completedAt,
    );

    const workoutStreak = new CalcWorkoutStreak().execute({
      completedWorkoutSessions,
      fromDate: weekStart,
      toDate: today,
      workoutPlans,
    });

    const todayWorkoutDay = workoutPlan.workoutDays.find(
      ({ weekDay }) => weekDay === WeekDay[today.day()],
    );

    return {
      activeWorkoutPlanId: workoutPlan.id,
      consistencyByDay,
      todayWorkoutDay: todayWorkoutDay && {
        ...todayWorkoutDay,
        exercisesCount: todayWorkoutDay._count.exercises,
      },
      workoutStreak,
    };
  }
}
