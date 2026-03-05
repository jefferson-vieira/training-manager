import z from 'zod';

import { WeekDay } from '../generated/prisma/enums.js';

export const HomeSchema = z.object({
  activeWorkoutPlanId: z.uuid().optional(),
  consistencyByDay: z.record(
    z.iso.date(),
    z.object({
      workoutDayCompleted: z.boolean(),
      workoutDayStarted: z.boolean(),
    }),
  ),
  todayWorkoutDay: z
    .object({
      coverImageUrl: z.url().nullish(),
      estimatedDurationInSeconds: z.number(),
      exercisesCount: z.number(),
      id: z.uuid(),
      isRest: z.boolean(),
      name: z.string(),
      weekDay: z.enum(WeekDay),
      workoutPlanId: z.uuid(),
    })
    .nullish(),
  workoutStreak: z.number(),
});

export type HomeSchema = z.infer<typeof HomeSchema>;
