import { redirect } from 'next/navigation';

import { WorkoutDayCard } from '@/components/workout-day-card';
import { getWorkoutDay } from '@/lib/api/fetch-generated';

import { CompleteWorkoutButton } from './_components/complete-workout-button';
import { ExerciseList } from './_components/exercise-list';
import { WorkoutDayHeader } from './_components/workout-day-header';
import { WorkoutSessionAction } from './_components/workout-session-action';

type WorkoutDayPageProps = {
  params: Promise<{
    workoutDayId: string;
    workoutPlanId: string;
  }>;
};

export default async function WorkoutDayPage({
  params,
}: Readonly<WorkoutDayPageProps>) {
  const { workoutDayId, workoutPlanId } = await params;

  const workoutDay = await getWorkoutDay(workoutPlanId, workoutDayId);

  if (workoutDay.status !== 200 || workoutDay.data.isRest) {
    redirect('/');
  }

  const { exercises, session } = workoutDay.data;

  const isInProgress = Boolean(session && !session.completedAt);

  return (
    <>
      <WorkoutDayHeader />

      <div className="flex flex-col gap-5 px-5 pb-5">
        <WorkoutDayCard
          action={
            <WorkoutSessionAction
              session={session}
              workoutDayId={workoutDayId}
              workoutPlanId={workoutPlanId}
            />
          }
          workoutDay={workoutDay.data}
        />

        <ExerciseList exercises={exercises} />

        {isInProgress && session && (
          <CompleteWorkoutButton
            sessionId={session.id}
            workoutDayId={workoutDayId}
            workoutPlanId={workoutPlanId}
          />
        )}
      </div>
    </>
  );
}
