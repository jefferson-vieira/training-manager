import z from 'zod';

export const WorkoutSessionSchema = z.object({
  completedAt: z.iso.date(),
  id: z.uuid(),
  startedAt: z.iso.date(),
});
