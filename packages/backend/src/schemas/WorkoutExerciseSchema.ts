import z from 'zod';

export const WorkoutExerciseSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  order: z.number().min(0),
  reps: z.number().min(1),
  restTimeInSeconds: z.number().min(1),
  sets: z.number().min(1),
});
