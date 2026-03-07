import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  BETTER_AUTH_URL: z.string(),
  DATABASE_URL: z.string(),
  PORT: z.coerce.number(),
  SYSTEM_PROMPT: z.string(),
});

export const env = envSchema.parse(process.env);
