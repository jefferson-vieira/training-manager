import { NotFoundError } from '../../errors/NotFoundError.js';
import { prisma } from '../../lib/db.js';

interface InputDto {
  sessionId: string;
  userId: string;
  workoutDayId: string;
  workoutPlanId: string;
}

export class CompleteWorkoutSession {
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

    const workoutSession = await prisma.workoutSession.findFirst({
      where: {
        id: dto.sessionId,
        workoutDayId: dto.workoutDayId,
      },
    });

    if (!workoutSession) {
      throw new NotFoundError('Workout session not found');
    }

    const updatedWorkoutSession = await prisma.workoutSession.update({
      data: {
        completedAt: new Date(),
      },
      select: {
        completedAt: true,
        id: true,
        startedAt: true,
      },
      where: {
        id: dto.sessionId,
      },
    });

    return {
      ...updatedWorkoutSession,
      completedAt: updatedWorkoutSession.completedAt!.toISOString(),
      startedAt: updatedWorkoutSession.startedAt.toISOString(),
    };
  }
}
