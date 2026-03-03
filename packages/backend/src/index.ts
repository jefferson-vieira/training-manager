import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import Fastify from 'fastify';
import {
  createJsonSchemaTransform,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { z } from 'zod/v4';

import { env } from './config/env.ts';

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

app.register(fastifySwaggerUI, {
  routePrefix: '/documentation',
});

app.after(() => {
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
});

try {
  await app.ready();

  await app.listen({ port: env.PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
