import z from 'zod';

import { WorkoutDaySchema } from '../schemas/WorkoutDaySchema.js';
import { CreateWorkoutExerciseRequest } from './CreateWorkoutExerciseRequest.js';

export const CreateWorkoutDayRequest = WorkoutDaySchema.omit({
  id: true,
}).extend({
  coverImageUrl: WorkoutDaySchema.shape.coverImageUrl.optional(),
  exercises: z.array(CreateWorkoutExerciseRequest),
});
