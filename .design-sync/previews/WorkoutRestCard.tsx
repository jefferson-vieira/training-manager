import { WorkoutRestCard } from 'web';

export function Default() {
  return (
    <div className="w-80">
      <WorkoutRestCard workoutDay={{ name: 'Descanso', weekDay: 'SUNDAY' }} />
    </div>
  );
}

export function ActiveRecovery() {
  return (
    <div className="w-80">
      <WorkoutRestCard
        workoutDay={{ name: 'Recuperação ativa', weekDay: 'THURSDAY' }}
      />
    </div>
  );
}
