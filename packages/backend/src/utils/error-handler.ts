import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

import type { App } from '../lib/fastify.js';

import { NotFoundError } from '../errors/NotFoundError.js';
import { UnauthorizedError } from '../errors/UnauthorizedError.js';

export function registerErrorHandler(app: App) {
  app.setErrorHandler((error, _, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        error: 'Invalid request payload',
      });
    }

    if (error instanceof UnauthorizedError) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        error: error.message,
      });
    }

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
