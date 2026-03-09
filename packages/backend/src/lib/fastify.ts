import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

import { env } from '../config/env.js';

export type App = ReturnType<typeof buildApp>;

const envToLogger = {
  development: {
    transport: {
      options: {
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss Z',
      },
      target: 'pino-pretty',
    },
  },
  production: true,
  test: false,
};

export function buildApp() {
  const app = Fastify({
    logger: envToLogger[env.NODE_ENV],
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  return app;
}
