import { Button, WorkoutDayCard } from 'web';
import { Play } from 'lucide-react';

const COVER =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=70';

export function Default() {
  return (
    <WorkoutDayCard
      workoutDay={{
        coverImageUrl: COVER,
        estimatedDurationInSeconds: 3600,
        exercisesCount: 8,
        name: 'Peito e Tríceps',
        weekDay: 'MONDAY',
      }}
    />
  );
}

export function WithAction() {
  return (
    <WorkoutDayCard
      action={
        <Button size="icon" aria-label="Iniciar treino">
          <Play />
        </Button>
      }
      workoutDay={{
        coverImageUrl: COVER,
        estimatedDurationInSeconds: 2700,
        exercisesCount: 6,
        name: 'Costas e Bíceps',
        weekDay: 'WEDNESDAY',
      }}
    />
  );
}

export function WithoutCover() {
  return (
    <WorkoutDayCard
      workoutDay={{
        coverImageUrl: null,
        estimatedDurationInSeconds: 1800,
        exercisesCount: 5,
        name: 'Mobilidade e Core',
        weekDay: 'FRIDAY',
      }}
    />
  );
}

export function CountedFromExercises() {
  return (
    <WorkoutDayCard
      workoutDay={{
        coverImageUrl: COVER,
        estimatedDurationInSeconds: 4500,
        exercises: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        name: 'Pernas Completo',
        weekDay: 'SATURDAY',
      }}
    />
  );
}
