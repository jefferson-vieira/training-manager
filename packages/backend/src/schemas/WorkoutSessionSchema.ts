import z from 'zod';

export const WorkoutSessionSchema = z.object({
  id: z.uuid(),
});
