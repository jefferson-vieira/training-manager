import z from 'zod';

import { WorkoutDaySchema } from '../schemas/WorkoutDaySchema.js';
import { CreateWorkoutExerciseRequest } from './CreateWorkoutExerciseRequest.js';

export const CreateWorkoutDayRequest = WorkoutDaySchema.omit({
  id: true,
}).extend({
  coverImageUrl: WorkoutDaySchema.shape.coverImageUrl.optional().meta({
    ...WorkoutDaySchema.shape.coverImageUrl.meta(),
  }),
  exercises: z.array(CreateWorkoutExerciseRequest).meta({
    ...WorkoutDaySchema.shape.exercises.meta(),
  }),
});
