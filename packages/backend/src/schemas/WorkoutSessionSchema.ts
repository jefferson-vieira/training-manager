import z from 'zod';

export const WorkoutSessionSchema = z.object({
  completedAt: z.coerce.date().nullable().meta({
    description: 'Momento de conclusão da sessão (null enquanto em andamento)',
  }),
  id: z.uuid(),
  startedAt: z.coerce.date().meta({
    description: 'Momento de início da sessão',
  }),
});
