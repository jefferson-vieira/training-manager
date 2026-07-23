import type { UIMessage } from 'ai';

import { google } from '@ai-sdk/google';
import { convertToModelMessages, stepCountIs, streamText, tool } from 'ai';
import z from 'zod';

import type { App } from '../lib/fastify.js';

import { env } from '../config/env.js';
import { CreateWorkoutPlanRequest } from '../dtos/CreateWorkoutPlanRequest.js';
import { UpsertUserProfileRequest } from '../dtos/UpsertUserProfileRequest.js';
import { getSession } from '../lib/auth.js';
import { GetUser } from '../use-cases/user/GetUser.js';
import { UpsertUserProfile } from '../use-cases/user/UpsertUserProfile.js';
import { CreateWorkoutPlan } from '../use-cases/workout-plan/CreateWorkoutPlan.js';
import { GetWorkoutPlans } from '../use-cases/workout-plan/GetWorkoutPlans.js';

export const aiRoutes = async (app: App) => {
  app.post('/', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);

      const userId = session.user.id;

      const { messages } = request.body as { messages: UIMessage[] };

      const result = streamText({
        messages: await convertToModelMessages(messages),
        model: google('gemini-2.5-flash'),
        stopWhen: stepCountIs(10),
        system: env.SYSTEM_PROMPT,
        tools: {
          createWorkoutPlan: tool({
            description:
              'Cria um novo plano de treino completo para o usuário.',
            execute: async (input) => {
              const createWorkoutPlan = new CreateWorkoutPlan();

              const workoutPlan = await createWorkoutPlan.execute({
                ...input,
                userId,
              });

              return {
                homeUrl: env.CLIENT_ORIGIN,
                workoutPlan,
              };
            },
            inputSchema: CreateWorkoutPlanRequest,
          }),
          getUser: tool({
            description:
              'Busca os dados de treino do usuário autenticado (peso, altura, idade, % gordura). Retorna um erro com o código NOT_FOUND_ERROR se não houver dados cadastrados.',
            execute: async () => {
              const getUserTrainData = new GetUser();

              return getUserTrainData.execute({
                userId,
              });
            },
            inputSchema: z.strictObject({}),
          }),
          getWorkoutPlans: tool({
            description:
              'Lista todos os planos de treino do usuário autenticado.',
            execute: async () => {
              const listWorkoutPlans = new GetWorkoutPlans();

              return listWorkoutPlans.execute({
                userId,
              });
            },
            inputSchema: z.strictObject({}),
          }),
          upsertUserProfile: tool({
            description: 'Atualiza os dados de perfil do usuário autenticado.',
            execute: async (input) => {
              const upsertUserProfile = new UpsertUserProfile();

              return upsertUserProfile.execute({
                ...input,
                userId,
              });
            },
            inputSchema: UpsertUserProfileRequest,
          }),
        },
      });

      const response = result.toUIMessageStreamResponse();

      reply.status(response.status);

      response.headers.forEach((value, key) => reply.header(key, value));

      return reply.send(response.body);
    },
    schema: {
      operationId: 'ai',
      summary: 'Chat with AI personal trainer',
      tags: ['AI'],
    },
  });
};
