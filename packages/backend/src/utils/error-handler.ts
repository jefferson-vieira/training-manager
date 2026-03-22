import type { App } from '../lib/fastify.js';

import { NotFoundError } from '../errors/NotFoundError.js';

export function registerErrorHandler(app: App) {
  app.setErrorHandler((error, _, reply) => {
    if (error instanceof NotFoundError) {
      return reply.status(404).send({
        code: 'NOT_FOUND_ERROR',
        error: error.message,
      });
    }

    app.log.error(error);

    return reply.status(500).send({
      code: 'INTERNAL_SERVER_ERROR',
      error: 'Internal Server Error',
    });
  });
}
