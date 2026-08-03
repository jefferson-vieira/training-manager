import { pino } from 'pino';

import { env } from '../config/env.js';

const optionsByEnv = {
  development: {
    transport: {
      options: {
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss Z',
      },
      target: 'pino-pretty',
    },
  },
  production: {},
  test: {
    enabled: false,
  },
};

// Shared with Fastify via `loggerInstance` so that code running outside a
// request — better-auth callbacks, e-mail use-cases — logs to the same stream
// instead of falling back to console.
export const logger = pino(optionsByEnv[env.NODE_ENV]);
