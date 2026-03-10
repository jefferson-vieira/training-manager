import type z from 'zod';

import type { CreateWorkoutPlanRequest } from '../../dtos/CreateWorkoutPlanRequest.js';

import { NotFoundError } from '../../errors/NotFoundError.js';
import { prisma } from '../../lib/db.js';

interface InputDto extends z.infer<typeof CreateWorkoutPlanRequest> {
  userId: string;
}

export class CreateWorkoutPlan {
  async execute(dto: InputDto) {
    const currentWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        isActive: true,
        userId: dto.userId,
      },
    });

    return prisma.$transaction(async (tx) => {
      if (currentWorkoutPlan) {
        await tx.workoutPlan.update({
          data: {
            isActive: false,
          },
          where: {
            id: currentWorkoutPlan.id,
          },
        });
      }

      const createdWorkoutPlan = await tx.workoutPlan.create({
        data: {
          ...dto,
          isActive: true,
          workoutDays: {
            create: dto.workoutDays.map((workoutDay) => ({
              ...workoutDay,
              exercises: {
                create: workoutDay.exercises,
              },
            })),
          },
        },
      });

      const workoutPlan = await tx.workoutPlan.findUnique({
        include: {
          workoutDays: {
            include: {
              exercises: true,
            },
          },
        },
        where: {
          id: createdWorkoutPlan.id,
        },
      });

      if (!workoutPlan) {
        throw new NotFoundError('Workout plan not found');
      }

      return workoutPlan;
    });
  }
}
