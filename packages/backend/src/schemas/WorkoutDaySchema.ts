import z from 'zod';

import { WeekDay } from '../generated/prisma/enums.js';
import { WorkoutExerciseSchema } from './WorkoutExerciseSchema.js';

export const WorkoutDaySchema = z.object({
  coverImageUrl: z.url().nullable(),
  estimatedDurationInSeconds: z.number().min(1),
  exercises: z.array(WorkoutExerciseSchema),
  id: z.uuid(),
  isRest: z.boolean().default(false),
  name: z.string().trim().min(1),
  weekDay: z.enum(WeekDay),
});
