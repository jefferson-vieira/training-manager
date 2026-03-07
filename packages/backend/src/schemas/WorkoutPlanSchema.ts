import z from 'zod';

import { WorkoutDaySchema } from './WorkoutDaySchema.js';

export const WorkoutPlanSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).meta({
    description: 'Nome do plano de treino',
  }),
  workoutDays: z.array(WorkoutDaySchema).meta({
    description: 'Lista com exatamente 7 dias de treino (segunda a domingo)',
  }),
});
