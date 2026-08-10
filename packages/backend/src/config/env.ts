import 'dotenv/config';
import { z } from 'zod';

const baseEnvSchema = z.object({
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(300),
  AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60),
  AUTH_SESSION_EXPIRES_IN: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),
  AVATAR_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(2 * 1024 * 1024),
  BETTER_AUTH_URL: z.url(),
  CLIENT_ORIGIN: z.url(),
  DATABASE_URL: z.string(),
  DOMAIN: z.string(),
  EMAIL_FROM: z.string().min(1),
  EMAIL_LOGO_URL: z.url(),
  EMAIL_SUPPORT_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  HOST: z.string(),
  LLM_MODEL: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PASSWORD_RESET_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(3),
  PASSWORD_RESET_RATE_LIMIT_WINDOW: z.coerce
    .number()
    .int()
    .positive()
    .default(900),
  PORT: z.coerce.number(),
  SUPABASE_S3_ACCESS_KEY_ID: z.string().min(1),
  SUPABASE_S3_BUCKET: z.string().min(1),
  SUPABASE_S3_ENDPOINT: z.url(),
  SUPABASE_S3_REGION: z.string().min(1),
  SUPABASE_S3_SECRET_ACCESS_KEY: z.string().min(1),
  SUPABASE_URL: z.url(),
  SYSTEM_PROMPT: z.string(),
});

const llmEnvSchema = z.discriminatedUnion('LLM_PROVIDER', [
  baseEnvSchema.extend({
    GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
    LLM_PROVIDER: z.literal('google'),
  }),
  baseEnvSchema.extend({
    LLM_PROVIDER: z.literal('ollama'),
    OLLAMA_BASE_URL: z.url(),
  }),
]);

const emailEnvSchema = z.discriminatedUnion('EMAIL_PROVIDER', [
  z.object({
    EMAIL_PROVIDER: z.literal('console'),
  }),
  z.object({
    EMAIL_PROVIDER: z.literal('resend'),
    RESEND_API_KEY: z.string().min(1),
  }),
]);

const envSchema = z.intersection(llmEnvSchema, emailEnvSchema);

export const env = envSchema.parse(process.env);
