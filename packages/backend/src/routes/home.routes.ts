import type { App } from '../lib/fastify.js';

import { getSession } from '../lib/auth.js';
import { ErrorSchema } from '../schemas/ErrorSchema.js';
import { HomeSchema } from '../schemas/HomeSchema.js';
import { GetHomeData } from '../use-cases/home/GetHomeData.js';

export const homeRoutes = (app: App) => {
  app.get('/', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);

      const getHomeData = new GetHomeData();

      const result = await getHomeData.execute({
        userId: session.user.id,
      });

      return reply.status(200).send(result);
    },
    schema: {
      operationId: 'getHomeData',
      response: {
        200: HomeSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'Get home page data',
      tags: ['Home'],
    },
  });
};
