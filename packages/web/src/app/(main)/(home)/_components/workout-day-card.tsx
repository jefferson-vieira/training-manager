import { Calendar, Dumbbell, Timer } from 'lucide-react';
import Image from 'next/image';

import type { GetWorkoutDay200WeekDay } from '@/lib/api/fetch-generated';

const WEEKDAY_LABELS: Record<string, string> = {
  FRIDAY: 'SEXTA',
  MONDAY: 'SEGUNDA',
  SATURDAY: 'SÁBADO',
  SUNDAY: 'DOMINGO',
  THURSDAY: 'QUINTA',
  TUESDAY: 'TERÇA',
  WEDNESDAY: 'QUARTA',
};

interface WorkoutDayCardProps {
  coverImageUrl?: null | string;
  estimatedDurationInSeconds: number;
  exercisesCount: number;
  name: string;
  weekDay: GetWorkoutDay200WeekDay;
}

export function WorkoutDayCard({
  coverImageUrl,
  estimatedDurationInSeconds,
  exercisesCount,
  name,
  weekDay,
}: WorkoutDayCardProps) {
  const durationInMinutes = Math.round(estimatedDurationInSeconds / 60);

  return (
    <div className="relative flex h-[200px] w-full flex-col items-start justify-between overflow-hidden rounded-xl p-5">
      {coverImageUrl && (
        <Image
          alt={name}
          className="pointer-events-none object-cover"
          fill
          src={coverImageUrl}
        />
      )}
      <div className="absolute inset-0 bg-foreground/40" />
      <div className="relative">
        <div className="flex items-center gap-1 rounded-full bg-background/16 px-2.5 py-1.5 backdrop-blur-sm">
          <Calendar className="size-3.5 text-background" />
          <span className="font-heading text-xs font-semibold text-background uppercase">
            {WEEKDAY_LABELS[weekDay]}
          </span>
        </div>
      </div>
      <div className="relative flex flex-col gap-2">
        <h3 className="font-heading text-2xl leading-[1.05] font-semibold text-background">
          {name}
        </h3>
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
    </div>
  );
}
