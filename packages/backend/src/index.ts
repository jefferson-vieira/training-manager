import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import cors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import scalar from '@scalar/fastify-api-reference';
import Fastify from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { z } from 'zod/v4';

import { env } from './config/env.js';
import { auth } from './lib/auth.js';

const app = Fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

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
  origin: `http://localhost:${env.PORT}`,
});

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
    url: '/api/auth/*',
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    handler: (req, res) => {
      res.send(req.query.name);
    },
    method: 'GET',
    schema: {
      querystring: z.object({
        name: z.string().min(4),
      }),
      response: {
        200: z.string(),
      },
    },
    url: '/',
  });

  app.get('/openapi.json', async () => {
    return app.swagger();
  });
});

try {
  await app.ready();

  await app.listen({ port: env.PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
