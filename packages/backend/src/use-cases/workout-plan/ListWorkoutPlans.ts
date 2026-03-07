import type { Prisma } from '../../generated/prisma/client.js';

import { prisma } from '../../lib/db.js';

interface InputDto extends Partial<Prisma.WorkoutPlanModel> {
  userId: string;
}

export class ListWorkoutPlans {
  async execute(dto: InputDto) {
    const workoutPlans = await prisma.workoutPlan.findMany({
      include: {
        workoutDays: {
          include: {
            exercises: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      where: dto,
    });

    return workoutPlans;
  }
}
