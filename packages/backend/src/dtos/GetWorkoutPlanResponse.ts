import z from 'zod';

import { WorkoutDaySchema } from '../schemas/WorkoutDaySchema.js';
import { WorkoutPlanSchema } from '../schemas/WorkoutPlanSchema.js';

export const GetWorkoutPlanResponse = WorkoutPlanSchema.extend({
  userId: z.string(),
  workoutDays: z.array(
    WorkoutDaySchema.omit({
      exercises: true,
    }).extend({
      exercisesCount: z.number(),
    }),
  ),
});
