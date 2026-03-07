import z from 'zod';

export const GetStatsResponse = z.object({
  completedWorkoutsCount: z.number(),
  conclusionRate: z.number(),
  consistencyByDay: z.record(
    z.iso.date(),
    z.object({
      workoutDayCompleted: z.boolean(),
      workoutDayStarted: z.boolean(),
    }),
  ),
  totalTimeInSeconds: z.number(),
  workoutStreak: z.number(),
});

export type GetStatsResponse = z.infer<typeof GetStatsResponse>;
