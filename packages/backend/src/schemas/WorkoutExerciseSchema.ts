import z from 'zod';

export const WorkoutExerciseSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).meta({
    description: 'Nome do exercício',
  }),
  order: z.number().min(0).meta({
    description: 'Ordem do exercício no dia',
  }),
  reps: z.number().min(1).meta({
    description: 'Número de repetições',
  }),
  restTimeInSeconds: z.number().min(1).meta({
    description: 'Tempo de descanso entre séries em segundos',
  }),
  sets: z.number().min(1).meta({
    description: 'Número de séries',
  }),
});
