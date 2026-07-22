'use server';

import { revalidatePath } from 'next/cache';

import {
  completeWorkoutSession,
  startWorkoutSession,
} from '@/lib/api/fetch-generated';

type CompleteWorkoutSessionInput = {
  sessionId: string;
  workoutDayId: string;
  workoutPlanId: string;
};

type StartWorkoutSessionInput = {
  workoutDayId: string;
  workoutPlanId: string;
};

type StartWorkoutSessionResult =
  | { ok: false; reason: 'conflict' | 'error' }
  | { ok: true; sessionId: string };

export async function completeWorkoutSessionAction({
  sessionId,
  workoutDayId,
  workoutPlanId,
}: CompleteWorkoutSessionInput): Promise<{ ok: boolean }> {
  const response = await completeWorkoutSession(
    workoutPlanId,
    workoutDayId,
    sessionId,
  );

  if (response.status === 200) {
    revalidatePath(workoutDayPath(workoutPlanId, workoutDayId));

    return { ok: true };
  }

  return { ok: false };
}

export async function startWorkoutSessionAction({
  workoutDayId,
  workoutPlanId,
}: StartWorkoutSessionInput): Promise<StartWorkoutSessionResult> {
  const response = await startWorkoutSession(workoutPlanId, workoutDayId);

  if (response.status === 201) {
    revalidatePath(workoutDayPath(workoutPlanId, workoutDayId));

    return { ok: true, sessionId: response.data.id };
  }

  if (response.status === 409) {
    revalidatePath(workoutDayPath(workoutPlanId, workoutDayId));

    return { ok: false, reason: 'conflict' };
  }

  return { ok: false, reason: 'error' };
}

function workoutDayPath(workoutPlanId: string, workoutDayId: string) {
  return `/workout-plans/${workoutPlanId}/days/${workoutDayId}`;
}
