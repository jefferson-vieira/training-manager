import type { App } from '../lib/fastify.js';

import { getSession } from '../lib/auth.js';
import { ErrorSchema } from '../schemas/ErrorSchema.js';
import { UserSchema } from '../schemas/UserSchema.js';
import { GetUserWithProfile } from '../use-cases/user/GetUserWithProfile.js';

export const meRoutes = async (app: App) => {
  app.get('/', {
    handler: async (request, reply) => {
      const session = await getSession(request, reply);

      const getUserWithProfile = new GetUserWithProfile();

      const result = await getUserWithProfile.execute({
        userId: session.user.id,
      });

      return reply.status(200).send(result);
    },
    schema: {
      operationId: 'getUser',
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
