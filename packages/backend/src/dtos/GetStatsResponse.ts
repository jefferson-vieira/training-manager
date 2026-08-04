import z from 'zod';

export const GetStatsResponse = z.object({
  completedWorkoutsCount: z.number().meta({
    description: 'Quantidade de sessões de treino concluídas no período.',
  }),
  conclusionRate: z.number().meta({
    description:
      'Proporção entre 0 e 1 das sessões iniciadas no período que foram concluídas.',
  }),
  consistencyByDay: z
    .record(
      z.iso.date(),
      z.object({
        workoutDayCompleted: z.boolean().meta({
          description:
            'Pelo menos uma sessão iniciada neste dia foi concluída.',
        }),
        workoutDayStarted: z.boolean().meta({
          description: 'Pelo menos uma sessão foi iniciada neste dia.',
        }),
      }),
    )
    .meta({
      description:
        'Dias do período com ao menos uma sessão, indexados pela data (YYYY-MM-DD). Dias sem sessão são omitidos.',
    }),
  totalTimeInSeconds: z.number().meta({
    description: 'Soma da duração das sessões concluídas no período.',
  }),
  workoutStreak: z.number().meta({
    description:
      'Sequência atual, em dias, de treinos concluídos nos dias agendados. Não se limita ao período consultado.',
  }),
  workoutStreakRecord: z.number().meta({
    description:
      'Maior sequência, em dias, já alcançada pelo usuário. Não se limita ao período consultado.',
  }),
});

export type GetStatsResponse = z.infer<typeof GetStatsResponse>;
