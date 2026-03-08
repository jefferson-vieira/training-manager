import z from 'zod';

import { WorkoutPlanSchema } from '../schemas/WorkoutPlanSchema.js';
import { CreateWorkoutDayRequest } from './CreateWorkoutDayRequest.js';

export const CreateWorkoutPlanRequest = WorkoutPlanSchema.omit({
  id: true,
}).extend({
  workoutDays: z.array(CreateWorkoutDayRequest).meta({
    ...WorkoutPlanSchema.shape.workoutDays.meta(),
  }),
});
