import { Calendar, Zap } from 'lucide-react';

import type { GetActiveWorkoutPlan200WorkoutDaysItem } from '@/lib/api/fetch-generated';

import { Badge } from '@/components/ui/badge';
import { WEEKDAY_LABELS } from '@/helpers/workout-day';

type WorkoutRestCardProps = {
  workoutDay: GetActiveWorkoutPlan200WorkoutDaysItem;
};

export function WorkoutRestCard({
  workoutDay,
}: Readonly<WorkoutRestCardProps>) {
  const { name, weekDay } = workoutDay;

  return (
    <div className="flex w-full flex-col gap-5 rounded-xl bg-muted p-5">
      <Badge className="border-0 bg-foreground/8 py-1.5 text-foreground uppercase backdrop-blur-sm">
        <Calendar />
        {WEEKDAY_LABELS[weekDay]}
      </Badge>

      <div className="flex items-center gap-2">
        <Zap className="size-5 shrink-0 fill-primary text-primary" />
        <span className="font-heading text-2xl leading-[1.05] font-semibold text-foreground">
          {name}
        </span>
      </div>
    </div>
  );
}
