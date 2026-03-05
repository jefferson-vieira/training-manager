import z from 'zod';

export const WorkoutSessionSchema = z.object({
  completedAt: z.date(),
  id: z.uuid(),
  startedAt: z.date(),
});
