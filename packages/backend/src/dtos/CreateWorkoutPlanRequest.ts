import z from 'zod';

import { WorkoutPlanSchema } from '../schemas/WorkoutPlanSchema.js';
import { CreateWorkoutDayRequest } from './CreateWorkoutDayRequest.js';

export const CreateWorkoutPlanRequest = WorkoutPlanSchema.omit({
  id: true,
}).extend({
  userId: z.string(),
  workoutDays: z.array(CreateWorkoutDayRequest),
});

export type ICreateWorkoutPlanRequest = z.infer<
  typeof CreateWorkoutPlanRequest
>;
