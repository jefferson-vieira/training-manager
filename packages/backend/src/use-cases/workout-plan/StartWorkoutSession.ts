import { NotFoundError } from '../../errors/NotFoundError.js';
import { SessionAlreadyStartedError } from '../../errors/SessionAlreadyStartedError.js';
import { prisma } from '../../lib/db.js';

interface InputDto {
  userId: string;
  workoutDayId: string;
  workoutPlanId: string;
}

export class StartWorkoutSession {
  async execute(dto: InputDto) {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: {
        id: dto.workoutPlanId,
        isActive: true,
        userId: dto.userId,
      },
    });

    if (!workoutPlan) {
      throw new NotFoundError('Workout plan not found');
    }

    const workoutDay = await prisma.workoutDay.findUnique({
      where: {
        id: dto.workoutDayId,
        workoutPlanId: dto.workoutPlanId,
      },
    });

    if (!workoutDay) {
      throw new NotFoundError('Workout day not found');
    }

    const existingWorkoutSession = await prisma.workoutSession.findFirst({
      where: {
        workoutDayId: dto.workoutDayId,
      },
    });

    if (existingWorkoutSession) {
      throw new SessionAlreadyStartedError();
    }

    const workoutSession = await prisma.workoutSession.create({
      data: {
        startedAt: new Date(),
        workoutDayId: dto.workoutDayId,
      },
      select: {
        id: true,
      },
    });

    return workoutSession;
  }
}
