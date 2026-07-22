import { Zap } from 'lucide-react';

import type { GetWorkoutDay200ExercisesItem } from '@/lib/api/fetch-generated';

import { Badge } from '@/components/ui/badge';

import { ExerciseHelpButton } from './exercise-help-button';

type ExerciseListProps = {
  exercises: GetWorkoutDay200ExercisesItem[];
};

export function ExerciseList({ exercises }: Readonly<ExerciseListProps>) {
  return (
    <ul className="flex flex-col gap-5">
      {exercises.map((exercise) => (
        <li
          key={exercise.id}
          className="flex flex-col gap-3 rounded-xl border border-border p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-base font-semibold text-foreground">
              {exercise.name}
            </h3>

            <ExerciseHelpButton exerciseName={exercise.name} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge
              className="font-heading text-muted-foreground uppercase"
              variant="secondary"
            >
              {exercise.sets} séries
            </Badge>
            <Badge
              className="font-heading text-muted-foreground uppercase"
              variant="secondary"
            >
              {exercise.reps} reps
            </Badge>
            <Badge
              className="font-heading text-muted-foreground uppercase"
              variant="secondary"
            >
              <Zap />
              {exercise.restTimeInSeconds}s
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
