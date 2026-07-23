import type { Route } from 'next';

import Link from 'next/link';

import type {
  GetActiveWorkoutPlan200WorkoutDaysItem,
  GetHomeData200TodayWorkoutDay,
} from '@/lib/api/fetch-generated';

import { WorkoutDayCard } from '@/components/workout-day-card';
import { WorkoutRestCard } from '@/components/workout-rest-card';

type WorkoutCardData =
  | GetActiveWorkoutPlan200WorkoutDaysItem
  | NonNullable<GetHomeData200TodayWorkoutDay>;

type WorkoutCardProps<T extends string> = {
  href: Route<T>;
  workoutDay: WorkoutCardData;
};

export function WorkoutCard<T extends string>({
  href,
  workoutDay,
}: Readonly<WorkoutCardProps<T>>) {
  if (workoutDay.isRest) {
    return <WorkoutRestCard workoutDay={workoutDay} />;
  }

  return (
    <Link href={href}>
      <WorkoutDayCard workoutDay={workoutDay} />
    </Link>
  );
}
