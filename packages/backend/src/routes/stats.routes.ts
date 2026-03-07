import z from 'zod';

import type { App } from '../lib/fastify.js';

import { GetStatsResponse } from '../dtos/GetStatsResponse.js';
import { getSession } from '../lib/auth.js';
import { ErrorSchema } from '../schemas/ErrorSchema.js';
import { GetStats } from '../use-cases/stats/GetStats.js';

export const statsRoutes = async (app: App) => {
  app.get('/', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);

      const getStats = new GetStats();

      const result = await getStats.execute({
        from: request.query.from,
        to: request.query.to,
        userId: session.user.id,
      });

      return reply.status(200).send(result);
    },
    schema: {
      querystring: z.object({
        from: z.iso.date(),
        to: z.iso.date(),
      }),
      response: {
        200: GetStatsResponse,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'Get user workout stats',
      tags: ['Stats'],
    },
  });
};
