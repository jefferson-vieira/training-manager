import type { FastifyRequest } from 'fastify';

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';
import { openAPI } from 'better-auth/plugins';

import { env } from '../config/env.js';
import { UnauthorizedError } from '../errors/UnauthorizedError.js';
import { InvalidatePreviousResetTokens } from '../use-cases/auth/InvalidatePreviousResetTokens.js';
import { SendPasswordChangedEmail } from '../use-cases/auth/SendPasswordChangedEmail.js';
import { SendPasswordResetEmail } from '../use-cases/auth/SendPasswordResetEmail.js';
import { prisma } from './db.js';
import { logger } from './logger.js';
import { consumePasswordResetAttempt } from './password-reset-rate-limit.js';

const BetterAuthPaths = {
  RequestPasswordReset: '/request-password-reset',
  ResetPassword: '/reset-password',
  SignInEmail: '/sign-in/email',
} as const;

export const auth = betterAuth({
  advanced: {
    cookiePrefix: 'training-manager',
    crossSubDomainCookies: {
      domain: env.DOMAIN,
      enabled: env.NODE_ENV === 'production',
    },
  },
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    async onPasswordReset({ user }) {
      const invalidatePreviousResetTokens = new InvalidatePreviousResetTokens();

      // Also the only thing that enforces single use: better-auth deletes the
      // spent token with `prisma.verification.delete({ where: { identifier } })`,
      // but `identifier` is not unique in the schema, so Prisma rejects the call
      // and the adapter swallows the error. Without this deleteMany the link
      // would keep working until it expires.
      await invalidatePreviousResetTokens.execute({
        userId: user.id,
      });

      const sendPasswordChangedEmail = new SendPasswordChangedEmail();

      sendPasswordChangedEmail.execute({
        email: user.email,
        name: user.name,
        userId: user.id,
      });

      logger.info(
        { event: 'password_reset.completed', userId: user.id },
        'Password reset and sessions revoked',
      );
    },
    resetPasswordTokenExpiresIn: env.AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ token, url, user }) {
      const invalidatePreviousResetTokens = new InvalidatePreviousResetTokens();

      // Keeps only the token just issued, so an older link stops working the
      // moment a new one is requested.
      await invalidatePreviousResetTokens.execute({
        keepToken: token,
        userId: user.id,
      });

      const sendPasswordResetEmail = new SendPasswordResetEmail();

      await sendPasswordResetEmail.execute({
        email: user.email,
        name: user.name,
        resetUrl: url,
        token,
        userId: user.id,
      });
    },
  },
  hooks: {
    // The rejection is thrown inside better-auth's own handler, so there is no
    // use-case of ours to log it from.
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== BetterAuthPaths.ResetPassword) {
        return;
      }

      const status = ctx.context.returned;

      if (
        !(status instanceof APIError) ||
        status.body?.code !== 'INVALID_TOKEN'
      ) {
        return;
      }

      logger.warn(
        { event: 'password_reset.invalid_token' },
        'Password reset attempted with an invalid or expired link',
      );
    }),
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== BetterAuthPaths.RequestPasswordReset) {
        return;
      }

      const email = (ctx.body as { email?: string } | undefined)?.email;

      if (!email) {
        return;
      }

      const { allowed } = consumePasswordResetAttempt(email);

      if (allowed) {
        return;
      }

      logger.warn(
        { event: 'password_reset.rate_limited' },
        'Per-address password reset limit reached',
      );

      throw new APIError('TOO_MANY_REQUESTS', {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests',
      });
    }),
  },
  plugins: [openAPI()],
  rateLimit: {
    customRules: {
      [BetterAuthPaths.RequestPasswordReset]: {
        max: env.AUTH_RATE_LIMIT_MAX,
        window: env.AUTH_RATE_LIMIT_WINDOW,
      },
      [BetterAuthPaths.SignInEmail]: {
        max: env.AUTH_RATE_LIMIT_MAX,
        window: env.AUTH_RATE_LIMIT_WINDOW,
      },
    },
    enabled: true,
    storage: 'memory',
  },
  session: {
    expiresIn: env.AUTH_SESSION_EXPIRES_IN,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Do not enable user-info overriding here. Removing a profile photo sets
      // `user.image` to null, which is exactly what a provider sync reads as
      // "empty, fill it" — the removal would silently undo itself on the next
      // Google sign-in, with no second removal able to make it stick. If sync
      // is ever needed for name or email, `image` must be excluded.
      prompt: 'select_account',
    },
  },
  trustedOrigins: [env.CLIENT_ORIGIN],
});

export const getSession = async (request: FastifyRequest) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (!session) {
    throw new UnauthorizedError();
  }

  return session;
};
