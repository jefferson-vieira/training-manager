import { WorkoutCard } from 'web';

const COVER =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=70';

export function TrainingDay() {
  return (
    <div className="w-80">
      <WorkoutCard
        href="/treinos/segunda"
        workoutDay={{
          coverImageUrl: COVER,
          estimatedDurationInSeconds: 3600,
          exercisesCount: 8,
          isRest: false,
          name: 'Peito e Tríceps',
          weekDay: 'MONDAY',
        }}
      />
    </div>
  );
}

export function RestDay() {
  return (
    <div className="w-80">
      <WorkoutCard
        href="/treinos/domingo"
        workoutDay={{
          isRest: true,
          name: 'Descanso',
          weekDay: 'SUNDAY',
        }}
      />
    </div>
  );
}

export function WeekList() {
  const days = [
    {
      coverImageUrl: COVER,
      estimatedDurationInSeconds: 3600,
      exercisesCount: 8,
      isRest: false,
      name: 'Peito e Tríceps',
      weekDay: 'MONDAY' as const,
    },
    {
      isRest: true,
      name: 'Descanso',
      weekDay: 'TUESDAY' as const,
    },
    {
      coverImageUrl: COVER,
      estimatedDurationInSeconds: 2700,
      exercisesCount: 6,
      isRest: false,
      name: 'Costas e Bíceps',
      weekDay: 'WEDNESDAY' as const,
    },
  ];

  return (
    <div className="flex w-80 flex-col gap-3">
      {days.map((day) => (
        <WorkoutCard
          key={day.weekDay}
          href={`/treinos/${day.weekDay.toLowerCase()}`}
          workoutDay={day}
        />
      ))}
    </div>
  );
}
