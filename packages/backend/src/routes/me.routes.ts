import type { App } from '../lib/fastify.js';

import { getSession } from '../lib/auth.js';
import { ErrorSchema } from '../schemas/ErrorSchema.js';
import { UserSchema } from '../schemas/UserSchema.js';
import { GetUser } from '../use-cases/user/GetUser.js';

export const meRoutes = async (app: App) => {
  app.get('/', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);

      const getUser = new GetUser();

      const result = await getUser.execute({
        userId: session.user.id,
      });

      return reply.status(200).send(result);
    },
    schema: {
      response: {
        200: UserSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
      summary: 'Get user',
      tags: ['Me'],
    },
  });
};
