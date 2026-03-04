import z from 'zod';

import { WorkoutDaySchema } from './WorkoutDaySchema.js';

export const WorkoutPlanSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  workoutDays: z.array(WorkoutDaySchema),
});
