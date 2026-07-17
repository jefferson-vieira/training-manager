import type { ReactNode } from 'react';

import { Calendar, Dumbbell, Timer } from 'lucide-react';
import Image from 'next/image';

import type {
  GetActiveWorkoutPlan200WorkoutDaysItem,
  GetHomeData200TodayWorkoutDay,
  GetWorkoutDay200,
} from '@/lib/api/fetch-generated';

import { WEEKDAY_LABELS } from '@/helpers/workout-day';
import { cn } from '@/lib/utils';

type WorkoutDayCardData =
  | GetActiveWorkoutPlan200WorkoutDaysItem
  | GetWorkoutDay200
  | NonNullable<GetHomeData200TodayWorkoutDay>;

type WorkoutDayCardProps = {
  action?: ReactNode;
  className?: string;
  workoutDay: WorkoutDayCardData;
};

export function WorkoutDayCard({
  action,
  className,
  workoutDay,
}: Readonly<WorkoutDayCardProps>) {
  const { coverImageUrl, estimatedDurationInSeconds, name, weekDay } =
    workoutDay;

  const exercisesCount = getExercisesCount(workoutDay);

  const durationInMinutes = Math.round(estimatedDurationInSeconds / 60);

  return (
    // Fixed-height media banner: the cover image is absolutely positioned (fill),
    // so height cannot come from content.
    <div
      className={cn(
        'relative flex h-[200px] w-full flex-col justify-between overflow-hidden rounded-xl p-5',
        className,
      )}
    >
      {coverImageUrl && (
        <Image
          alt={name}
          className="pointer-events-none object-cover"
          fill
          sizes="100vw"
          src={coverImageUrl}
        />
      )}
      <div className="absolute inset-0 bg-foreground/40" />

      <div className="relative">
        <div className="flex w-fit items-center gap-1 rounded-full bg-background/16 px-2.5 py-1.5 backdrop-blur-sm">
          <Calendar className="size-3.5 text-background" />
          <span className="font-heading text-xs font-semibold text-background uppercase">
            {WEEKDAY_LABELS[weekDay]}
          </span>
        </div>
      </div>

      <div className="relative flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-2xl leading-[1.05] font-semibold text-background">
            {name}
          </h2>
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1">
              <Timer className="size-3.5 text-background/70" />
              <span className="font-heading text-xs text-background/70">
                {durationInMinutes}min
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Dumbbell className="size-3.5 text-background/70" />
              <span className="font-heading text-xs text-background/70">
                {exercisesCount} exercícios
              </span>
            </div>
          </div>
        </div>

        {action}
      </div>
    </div>
  );
}

// GetWorkoutDay200 expõe a lista completa de exercícios, enquanto
// GetHomeData200TodayWorkoutDay já traz apenas a contagem.
function getExercisesCount(workoutDay: WorkoutDayCardData) {
  if ('exercises' in workoutDay) {
    return workoutDay.exercises.length;
  }

  return workoutDay.exercisesCount;
}
