import { WorkoutDaySchema } from '../schemas/WorkoutDaySchema.js';
import { WorkoutSessionSchema } from '../schemas/WorkoutSessionSchema.js';

export const GetWorkoutDayResponse = WorkoutDaySchema.extend({
  session: WorkoutSessionSchema.optional().meta({
    description: 'Sessão atual do dia (null quando não iniciada)',
  }),
});
