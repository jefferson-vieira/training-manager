import type { UIMessage } from 'ai';

import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  toUIMessageStream,
} from 'ai';
import z from 'zod';

import type { App } from '../lib/fastify.js';

import { env } from '../config/env.js';
import { CreateWorkoutPlanRequest } from '../dtos/CreateWorkoutPlanRequest.js';
import { UpsertUserProfileRequest } from '../dtos/UpsertUserProfileRequest.js';
import { languageModel } from '../lib/ai.js';
import { getSession } from '../lib/auth.js';
import { GetUser } from '../use-cases/user/GetUser.js';
import { GetUserProfile } from '../use-cases/user/GetUserProfile.js';
import { UpsertUserProfile } from '../use-cases/user/UpsertUserProfile.js';
import { CreateWorkoutPlan } from '../use-cases/workout-plan/CreateWorkoutPlan.js';
import { GetWorkoutPlans } from '../use-cases/workout-plan/GetWorkoutPlans.js';

export const aiRoutes = async (app: App) => {
  app.post('/', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);

      const userId = session.user.id;

      const { messages } = request.body as { messages: UIMessage[] };

      const tools = {
        createWorkoutPlan: tool({
          description: 'Cria um novo plano de treino completo para o usuário.',
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
            'Busca os dados de conta do usuário autenticado (id, nome e foto de perfil).',
          execute: async () => {
            const getUser = new GetUser();

            return getUser.execute({
              userId,
            });
          },
          inputSchema: z.strictObject({}),
        }),
        getUserProfile: tool({
          description:
            'Busca os dados de treino do usuário autenticado (peso em gramas, altura em centímetros, data de nascimento, idade e % de gordura de 0 a 1000). Retorna um erro com o código NOT_FOUND_ERROR quando o usuário ainda não tem dados cadastrados.',
          execute: async () => {
            const getUserProfile = new GetUserProfile();

            return getUserProfile.execute({
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
      };

      // O round-trip de "thinking" do Gemini (thoughtSignature) pode reenviar
      // parts de texto vazios no histórico; eles não batem com nenhum formato de
      // ModelMessage e derrubam o streamText com AI_InvalidPromptError. Removemos
      // parts de texto vazios e mensagens que ficarem sem conteúdo.
      const modelMessages = (await convertToModelMessages(messages)).filter(
        (message) => {
          if (!Array.isArray(message.content)) return true;

          message.content = message.content.filter(
            (part) => part.type !== 'text' || Boolean(part.text?.trim()),
          ) as typeof message.content;

          return message.content.length > 0;
        },
      );

      const result = streamText({
        abortSignal: AbortSignal.timeout(120_000),
        instructions: env.SYSTEM_PROMPT,
        messages: modelMessages,
        model: languageModel,
        stopWhen: isStepCount(10),
        tools,
      });

      const stream = toUIMessageStream({ stream: result.stream, tools });

      const response = createUIMessageStreamResponse({ stream });

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
