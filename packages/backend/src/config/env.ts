import 'dotenv/config';
import { z } from 'zod';

const baseEnvSchema = z.object({
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(300),
  AUTH_SESSION_EXPIRES_IN: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),
  BETTER_AUTH_URL: z.url(),
  CLIENT_ORIGIN: z.url(),
  DATABASE_URL: z.string(),
  DOMAIN: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  HOST: z.string(),
  LLM_MODEL: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number(),
  SYSTEM_PROMPT: z.string(),
});

const envSchema = z.discriminatedUnion('LLM_PROVIDER', [
  baseEnvSchema.extend({
    GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
    LLM_PROVIDER: z.literal('google'),
  }),
  baseEnvSchema.extend({
    LLM_PROVIDER: z.literal('ollama'),
    OLLAMA_BASE_URL: z.url(),
  }),
]);

export const env = envSchema.parse(process.env);
