import { Flame, Moon } from 'lucide-react';
import { redirect } from 'next/navigation';

import { HeaderBanner } from '@/components/header-banner';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/link';
import { WorkoutCard } from '@/components/workout-card';
import { HOME_ORIGIN } from '@/helpers/workout-day';
import { getHomeData } from '@/lib/api/fetch-generated';
import { getUser } from '@/lib/dal';

import { ConsistencyTracker } from './_components/consistency-tracker';

export default async function HomePage() {
  const [user, homeData] = await Promise.all([getUser(), getHomeData()]);

  if (homeData.status !== 200) {
    redirect('/onboarding');
  }

  const { consistencyByDay, todayWorkoutDay, workoutStreak } = homeData.data;

  const userName = user.name.split(' ')[0];

  const isRestDay = !todayWorkoutDay || todayWorkoutDay.isRest;

  return (
    <>
      <HeaderBanner src="/home-banner.jpg">
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-heading text-2xl leading-[1.05] font-semibold text-background">
              Olá, {userName}
            </h1>
            <p className="font-heading text-sm leading-[1.15] text-background/70">
              {isRestDay
                ? 'Vamos descansar e recuperar as energias!'
                : 'Bora treinar hoje?'}
            </p>
          </div>

          {isRestDay ? (
            <Badge className="border-0 bg-background/16 py-1.5 text-background uppercase backdrop-blur-sm">
              <Moon />
              Descanso
            </Badge>
          ) : (
            <LinkButton
              className="rounded-full"
              href={`/workout-plans/${todayWorkoutDay.workoutPlanId}/days/${todayWorkoutDay.id}?from=${HOME_ORIGIN}`}
              size="xl"
              variant="default"
            >
              Bora!
            </LinkButton>
          )}
        </div>
      </HeaderBanner>

      <div className="flex flex-col gap-3 px-5 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Consistência
          </h2>
          <LinkButton href="/stats">Ver histórico</LinkButton>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl border border-border p-5">
            <ConsistencyTracker consistencyByDay={consistencyByDay} />
          </div>
          <div className="flex items-center gap-2 self-stretch rounded-xl bg-streak/8 px-5 py-2">
            <Flame className="size-5 fill-streak text-streak" />
            <span className="font-heading text-base font-semibold text-foreground">
              {workoutStreak}
            </span>
          </div>
        </div>
      </div>

      {todayWorkoutDay && (
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Treino de Hoje
            </h2>

            <LinkButton href="/workout-plan">Ver treinos</LinkButton>
          </div>

          <WorkoutCard
            href={`/workout-plans/${todayWorkoutDay.workoutPlanId}/days/${todayWorkoutDay.id}?from=${HOME_ORIGIN}`}
            workoutDay={todayWorkoutDay}
          />
        </div>
      )}
    </>
  );
}
