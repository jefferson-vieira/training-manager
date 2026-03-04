import z from 'zod';

export const ErrorSchema = z.object({
  code: z.string(),
  error: z.string(),
});
