import z from 'zod';

import type { App } from '../lib/fastify.js';

import { CreateWorkoutPlanRequest } from '../dtos/CreateWorkoutPlanRequest.js';
import { GetWorkoutDayResponse } from '../dtos/GetWorkoutDayResponse.js';
import { GetWorkoutPlanResponse } from '../dtos/GetWorkoutPlanResponse.js';
import { SessionAlreadyStartedError } from '../errors/SessionAlreadyStartedError.js';
import { getSession } from '../lib/auth.js';
import { ErrorSchema } from '../schemas/ErrorSchema.js';
import { WorkoutPlanSchema } from '../schemas/WorkoutPlanSchema.js';
import { WorkoutSessionSchema } from '../schemas/WorkoutSessionSchema.js';
import { CompleteWorkoutSession } from '../use-cases/workout-plan/CompleteWorkoutSession.js';
import { CreateWorkoutPlan } from '../use-cases/workout-plan/CreateWorkoutPlan.js';
import { GetActiveWorkoutPlan } from '../use-cases/workout-plan/GetActiveWorkoutPlan.js';
import { GetWorkoutDay } from '../use-cases/workout-plan/GetWorkoutDay.js';
import { GetWorkoutPlan } from '../use-cases/workout-plan/GetWorkoutPlan.js';
import { GetWorkoutPlans } from '../use-cases/workout-plan/GetWorkoutPlans.js';
import { StartWorkoutSession } from '../use-cases/workout-plan/StartWorkoutSession.js';

export const workoutPlanRoutes = async (app: App) => {
  app.get('/', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);

      const getWorkoutPlans = new GetWorkoutPlans();

      const result = await getWorkoutPlans.execute({
        isActive: request.query.isActive,
        userId: session.user.id,
      });

      return reply.status(200).send(result);
    },
    schema: {
      operationId: 'getWorkoutPlans',
      querystring: z.object({
        isActive: z.boolean().optional(),
      }),
      response: {
        200: z.array(WorkoutPlanSchema),
        401: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'List workout plans',
      tags: ['Workout Plan'],
    },
  });

  app.get('/active', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);

      const getActiveWorkoutPlan = new GetActiveWorkoutPlan();

      const result = await getActiveWorkoutPlan.execute({
        userId: session.user.id,
      });

      return reply.status(200).send(result);
    },
    schema: {
      operationId: 'getActiveWorkoutPlan',
      response: {
        200: GetWorkoutPlanResponse,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'Get the active workout plan',
      tags: ['Workout Plan'],
    },
  });

  app.get('/:workoutPlanId', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);

      const getWorkoutPlan = new GetWorkoutPlan();

      const result = await getWorkoutPlan.execute({
        userId: session.user.id,
        workoutPlanId: request.params.workoutPlanId,
      });

      return reply.status(200).send(result);
    },
    schema: {
      operationId: 'getWorkoutPlan',
      params: z.object({
        workoutPlanId: z.uuid(),
      }),
      response: {
        200: GetWorkoutPlanResponse,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'Get a workout plan',
      tags: ['Workout Plan'],
    },
  });

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
      operationId: 'createWorkoutPlan',
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

  app.get('/:workoutPlanId/days/:workoutDayId', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);

      const getWorkoutDay = new GetWorkoutDay();

      const result = await getWorkoutDay.execute({
        userId: session.user.id,
        workoutDayId: request.params.workoutDayId,
        workoutPlanId: request.params.workoutPlanId,
      });

      return reply.status(200).send(result);
    },
    schema: {
      operationId: 'getWorkoutDay',
      params: z.object({
        workoutDayId: z.uuid(),
        workoutPlanId: z.uuid(),
      }),
      response: {
        200: GetWorkoutDayResponse,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'Get a workout day',
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
      operationId: 'startWorkoutSession',
      params: z.object({
        workoutDayId: z.uuid(),
        workoutPlanId: z.uuid(),
      }),
      response: {
        201: WorkoutSessionSchema.pick({ id: true }),
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

  app.patch('/:workoutPlanId/days/:workoutDayId/sessions/:sessionId/complete', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);

      const completeWorkoutSession = new CompleteWorkoutSession();

      const result = await completeWorkoutSession.execute({
        sessionId: request.params.sessionId,
        userId: session.user.id,
        workoutDayId: request.params.workoutDayId,
        workoutPlanId: request.params.workoutPlanId,
      });

      return reply.status(200).send(result);
    },
    schema: {
      operationId: 'completeWorkoutSession',
      params: z.object({
        sessionId: z.uuid(),
        workoutDayId: z.uuid(),
        workoutPlanId: z.uuid(),
      }),
      response: {
        200: WorkoutSessionSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'Complete a workout session',
      tags: ['Workout Plan'],
    },
  });
};
