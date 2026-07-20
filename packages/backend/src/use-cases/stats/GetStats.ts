import dayjs from 'dayjs';

import type { GetStatsResponse } from '../../dtos/GetStatsResponse.js';

import { NotFoundError } from '../../errors/NotFoundError.js';
import { prisma } from '../../lib/db.js';
import { CalcWorkoutStreak } from '../CalcStreak.js';

interface InputDto {
  from: string;
  to: string;
  userId: string;
}

export class GetStats {
  async execute(dto: InputDto) {
    const fromDate = dayjs(dto.from).startOf('day');

    const toDate = dayjs(dto.to).endOf('day');

    const workoutPlan = await prisma.workoutPlan.findFirst({
      include: {
        workoutDays: {
          select: {
            isRest: true,
            weekDay: true,
          },
        },
      },
      where: {
        isActive: true,
        userId: dto.userId,
      },
    });

    if (!workoutPlan) {
      throw new NotFoundError('Active workout plan not found');
    }

    const sessions = await prisma.workoutSession.findMany({
      select: {
        completedAt: true,
        startedAt: true,
      },
      where: {
        startedAt: {
          gte: fromDate.toDate(),
          lte: toDate.toDate(),
        },
        workoutDay: {
          workoutPlanId: workoutPlan.id,
        },
      },
    });

    const consistencyByDay: GetStatsResponse['consistencyByDay'] = {};

    sessions.forEach((session) => {
      const dateKey = dayjs(session.startedAt).format('YYYY-MM-DD');

      if (!consistencyByDay[dateKey]) {
        consistencyByDay[dateKey] = {
          workoutDayCompleted: false,
          workoutDayStarted: true,
        };
      }

      if (session.completedAt) {
        consistencyByDay[dateKey].workoutDayCompleted = true;
      }
    });

    const completedWorkoutSessions = sessions.filter(
      ({ completedAt }) => completedAt,
    );

    const completedWorkoutsCount = completedWorkoutSessions.length;

    const conclusionRate =
      sessions.length > 0 ? completedWorkoutsCount / sessions.length : 0;

    const totalTimeInSeconds = completedWorkoutSessions.reduce(
      (total, session) => {
        const start = dayjs(session.startedAt);

        const end = dayjs(session.completedAt);

        return total + end.diff(start, 'second');
      },
      0,
    );

    const workoutStreak = new CalcWorkoutStreak().execute({
      completedWorkoutSessions,
      fromDate,
      toDate,
      workoutDays: workoutPlan.workoutDays,
    });

    return {
      completedWorkoutsCount,
      conclusionRate,
      consistencyByDay,
      totalTimeInSeconds,
      workoutStreak,
    };
  }
}
