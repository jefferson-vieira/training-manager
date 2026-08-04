import type { Prisma } from '../../generated/prisma/client.js';

import { prisma } from '../../lib/db.js';

interface InputDto extends Partial<Prisma.WorkoutPlanModel> {
  userId: string;
}

export class GetWorkoutPlans {
  async execute(dto: InputDto) {
    const workoutPlans = await prisma.workoutPlan.findMany({
      include: {
        workoutDays: {
          include: {
            exercises: {
              omit: {
                createdAt: true,
                updatedAt: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
          omit: {
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      omit: {
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      where: dto,
    });

    return workoutPlans;
  }
}
