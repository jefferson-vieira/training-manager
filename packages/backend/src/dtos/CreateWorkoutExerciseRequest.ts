import { WorkoutExerciseSchema } from '../schemas/WorkoutExerciseSchema.js';

export const CreateWorkoutExerciseRequest = WorkoutExerciseSchema.omit({
  id: true,
});
