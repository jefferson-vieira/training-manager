import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  BETTER_AUTH_URL: z.url(),
  CLIENT_ORIGIN: z.url(),
  DATABASE_URL: z.string(),
  DOMAIN: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
  HOST: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number(),
  SYSTEM_PROMPT: z.string(),
});

export const env = envSchema.parse(process.env);
