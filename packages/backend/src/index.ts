import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import Fastify from 'fastify';
import {
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

try {
  await app.listen({ port: env.PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
