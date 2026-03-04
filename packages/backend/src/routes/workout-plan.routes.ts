import type { App } from '../lib/fastify.js';

import { getSession } from '../lib/auth.js';
import { ErrorSchema } from '../schemas/ErrorSchema.js';
import { WorkoutPlanSchema } from '../schemas/WorkoutPlanSchema.js';
import { CreateWorkoutPlan } from '../use-cases/workout-plan/CreateWorkoutPlan.js';
import { CreateWorkoutPlanRequest } from './../dtos/CreateWorkoutPlanRequest.js';

export const workoutPlanRoutes = async (app: App) => {
  app.post('/', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);

      const createWorkoutPlan = new CreateWorkoutPlan();

      const result = await createWorkoutPlan.execute({
        ...request.body,
        userId: session.user.id,
      });

      return reply.status(201).send(result);
    },
    schema: {
      body: CreateWorkoutPlanRequest,
      response: {
        201: WorkoutPlanSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'Create a workout plan',
      tags: ['Workout Plan'],
    },
  });
};
