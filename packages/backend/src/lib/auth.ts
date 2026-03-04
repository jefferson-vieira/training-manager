import type { FastifyReply, FastifyRequest } from 'fastify';

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { fromNodeHeaders } from 'better-auth/node';
import { openAPI } from 'better-auth/plugins';

import { env } from '../config/env.js';
import { prisma } from './db.js';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [openAPI()],
  trustedOrigins: [env.BETTER_AUTH_URL],
});

export const getSession = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (!session) {
    return reply.status(401).send({
      error: 'Unauthorized',
    });
  }

  return session;
};
