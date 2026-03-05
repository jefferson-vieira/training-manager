import { NotFoundError } from '../../errors/NotFoundError.js';
import { prisma } from '../../lib/db.js';

interface InputDto {
  userId: string;
  workoutPlanId: string;
}

export class GetWorkoutPlan {
  async execute(dto: InputDto) {
    const workoutPlan = await prisma.workoutPlan.findUnique({
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
        id: dto.workoutPlanId,
        userId: dto.userId,
      },
    });

    if (!workoutPlan) {
      throw new NotFoundError('Workout plan not found');
    }

    return {
      ...workoutPlan,
      workoutDays: workoutPlan.workoutDays.map(({ _count, ...workoutDay }) => ({
        ...workoutDay,
        exercisesCount: _count.exercises,
      })),
    };
  }
}
