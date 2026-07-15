import dayjs from 'dayjs';

import { NotFoundError } from '../../errors/NotFoundError.js';
import { prisma } from '../../lib/db.js';

interface InputDto {
  userId: string;
  workoutDayId: string;
  workoutPlanId: string;
}

export class GetWorkoutDay {
  async execute(dto: InputDto) {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: {
        id: dto.workoutPlanId,
        userId: dto.userId,
      },
    });

    if (!workoutPlan) {
      throw new NotFoundError('Workout plan not found');
    }

    const today = dayjs();

    const workoutDay = await prisma.workoutDay.findUnique({
      include: {
        exercises: {
          orderBy: {
            order: 'asc',
          },
        },
        sessions: {
          orderBy: {
            startedAt: 'desc',
          },
          take: 1,
          where: {
            startedAt: {
              gte: today.startOf('day').toDate(),
              lte: today.endOf('day').toDate(),
            },
          },
        },
      },
      where: {
        id: dto.workoutDayId,
        workoutPlanId: dto.workoutPlanId,
      },
    });

    if (!workoutDay) {
      throw new NotFoundError('Workout day not found');
    }

    const [session] = workoutDay.sessions;

    return {
      ...workoutDay,
      session: session,
    };
  }
}
