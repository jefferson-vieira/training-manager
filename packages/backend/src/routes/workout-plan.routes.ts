import z from 'zod';

import type { App } from '../lib/fastify.js';

import { SessionAlreadyStartedError } from '../errors/SessionAlreadyStartedError.js';
import { getSession } from '../lib/auth.js';
import { ErrorSchema } from '../schemas/ErrorSchema.js';
import { WorkoutPlanSchema } from '../schemas/WorkoutPlanSchema.js';
import { WorkoutSessionSchema } from '../schemas/WorkoutSessionSchema.js';
import { CreateWorkoutPlan } from '../use-cases/workout-plan/CreateWorkoutPlan.js';
import { StartWorkoutSession } from '../use-cases/workout-plan/StartWorkoutSession.js';
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

  app.post('/:workoutPlanId/days/:workoutDayId/sessions', {
    handler: async (request, reply) => {
      try {
        const session = await getSession(request, reply);

        const startWorkoutSession = new StartWorkoutSession();

        const result = await startWorkoutSession.execute({
          userId: session.user.id,
          workoutDayId: request.params.workoutDayId,
          workoutPlanId: request.params.workoutPlanId,
        });

        return reply.status(201).send(result);
      } catch (error) {
        app.log.error(error);

        if (error instanceof SessionAlreadyStartedError) {
          return reply.status(409).send({
            code: 'SESSION_ALREADY_STARTED_ERROR',
            error: error.message,
          });
        }

        throw error;
      }
    },
    schema: {
      params: z.object({
        workoutDayId: z.uuid(),
        workoutPlanId: z.uuid(),
      }),
      response: {
        201: WorkoutSessionSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        422: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'Start a workout session',
      tags: ['Workout Plan'],
    },
  });
};
