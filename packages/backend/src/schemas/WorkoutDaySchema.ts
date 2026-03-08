import z from 'zod';

import { WeekDay } from '../generated/prisma/enums.js';
import { WorkoutExerciseSchema } from './WorkoutExerciseSchema.js';

export const WorkoutDaySchema = z.object({
  coverImageUrl: z.url().nullable().meta({
    description:
      'URL da imagem de capa do dia de treino. Usar as URLs de superior ou inferior conforme o foco muscular do dia.',
  }),
  estimatedDurationInSeconds: z.number().min(0).meta({
    description: 'Duração estimada em segundos (0 para dias de descanso)',
  }),
  exercises: z.array(WorkoutExerciseSchema).meta({
    description: 'Lista de exercícios do dia (vazia para dias de descanso)',
  }),
  id: z.uuid(),
  isRest: z.boolean().default(false).meta({
    description: 'Se é dia de descanso (true) ou treino (false)',
  }),
  name: z.string().trim().min(1).meta({
    description:
      'Nome do dia (ex.: Peito e Tríceps, Costas e Bíceps, Descanso)',
  }),
  weekDay: z.enum(WeekDay).meta({
    description: 'Dia da semana',
  }),
});
