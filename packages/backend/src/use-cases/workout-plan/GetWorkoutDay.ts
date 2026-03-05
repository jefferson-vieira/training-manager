import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

import { NotFoundError } from '../../errors/NotFoundError.js';
import { prisma } from '../../lib/db.js';

dayjs.extend(utc);

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

    const workoutDay = await prisma.workoutDay.findUnique({
      include: {
        exercises: {
          orderBy: {
            order: 'asc',
          },
        },
        sessions: true,
      },
      where: {
        id: dto.workoutDayId,
        workoutPlanId: dto.workoutPlanId,
      },
    });

    if (!workoutDay) {
      throw new NotFoundError('Workout day not found');
    }

    return workoutDay;
  }
}
