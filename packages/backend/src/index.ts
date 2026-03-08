import cors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import scalar from '@scalar/fastify-api-reference';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

import { env } from './config/env.js';
import { auth } from './lib/auth.js';
import { buildApp } from './lib/fastify.js';
import { routes } from './routes/index.js';
import { registerErrorHandler } from './utils/error-handler.js';

const app = buildApp();

registerErrorHandler(app);

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'training-manager API',
      version: '1.0.0',
    },
    servers: [
      {
        description: 'localhost',
        url: `http://localhost:${env.PORT}`,
      },
    ],
  },
  transform: jsonSchemaTransform,
});

app.register(scalar, {
  configuration: {
    sources: [
      {
        slug: 'API',
        title: 'API',
        url: '/openapi.json',
      },
      {
        slug: 'auth-api',
        title: 'Auth',
        url: '/api/auth/open-api/generate-schema',
      },
    ],
  },
  routePrefix: '/docs',
});

app.register(cors, {
  credentials: true,
  origin: [env.BETTER_AUTH_URL, env.CLIENT_ORIGIN],
});

app.register(routes, { prefix: '/api' });

app.after(() => {
  app.route({
    async handler(request, reply) {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`);

        const headers = new Headers();

        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) headers.append(key, value.toString());
        });

        const req = new Request(url.toString(), {
          headers,
          method: request.method,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        });

        const response = await auth.handler(req);

        reply.status(response.status);

        response.headers.forEach((value, key) => reply.header(key, value));

        reply.send(response.body ? await response.text() : null);
      } catch (error) {
        app.log.error('Authentication Error:', error);

        reply.status(500).send({
          code: 'AUTH_FAILURE',
          error: 'Internal authentication error',
        });
      }
    },
    method: ['GET', 'POST'],
    schema: {
      hide: true,
    },
    url: '/api/auth/*',
  });

  app.get('/openapi.json', {
    handler: () => {
      return app.swagger();
    },
    schema: {
      hide: true,
    },
  });
});

try {
  await app.ready();

  await app.listen({ port: env.PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
