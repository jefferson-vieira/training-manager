import { Goal } from 'lucide-react';
import { redirect } from 'next/navigation';

import { HeaderBanner } from '@/components/header-banner';
import { Badge } from '@/components/ui/badge';
import { WorkoutCard } from '@/components/workout-card';
import { getActiveWorkoutPlan } from '@/lib/api/fetch-generated';

export default async function WorkoutPlanPage() {
  const workoutPlan = await getActiveWorkoutPlan();

  if (workoutPlan.status !== 200) {
    redirect('/onboarding');
  }

  const { id, name, workoutDays } = workoutPlan.data;

  return (
    <>
      <HeaderBanner src="/workout-plan-banner.jpg">
        <div className="flex max-w-full flex-col gap-3">
          <Badge className="max-w-full py-1.5 uppercase [&_svg]:size-4 [&_svg]:shrink-0">
            <Goal />
            {name}
          </Badge>
          <h1 className="font-heading text-2xl leading-[1.05] font-semibold text-background">
            Plano de Treino
          </h1>
        </div>
      </HeaderBanner>

      <div className="flex flex-col gap-3 p-5">
        {workoutDays.map((workoutDay) => (
          <WorkoutCard
            key={workoutDay.id}
            href={`/workout-plans/${id}/days/${workoutDay.id}`}
            workoutDay={workoutDay}
          />
        ))}
      </div>
    </>
  );
}
