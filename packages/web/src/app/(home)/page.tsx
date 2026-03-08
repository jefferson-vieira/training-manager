import dayjs from 'dayjs';
import { Flame } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getHomeData } from '@/lib/api/fetch-generated';
import { getUser } from '@/lib/dal';

import { BottomNav } from './_components/bottom-nav';
import { ConsistencyTracker } from './_components/consistency-tracker';
import { WorkoutDayCard } from './_components/workout-day-card';

export default async function HomePage() {
  const [user, homeData] = await Promise.all([getUser(), getHomeData()]);

  if (homeData.status !== 200) {
    redirect('/login');
  }

  const today = dayjs();

  const { consistencyByDay, todayWorkoutDay, workoutStreak } = homeData.data;

  const userName = user.name.split(' ')[0];

  return (
    <div className="flex min-h-svh flex-col bg-background pb-24">
      <div className="relative flex h-[296px] shrink-0 flex-col items-start justify-between overflow-hidden rounded-b-[20px] px-5 pt-5 pb-10">
        <div aria-hidden="true" className="absolute inset-0">
          <Image
            alt=""
            className="object-cover"
            fill
            priority
            src="/home-banner.jpg"
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(243deg, rgba(0,0,0,0) 34%, rgb(0,0,0) 100%)',
            }}
          />
        </div>

        <p
          className="relative text-[22px] leading-[1.15] text-background uppercase"
          style={{ fontFamily: 'var(--font-anton)' }}
        >
          Fit.ai
        </p>

        <div className="relative flex w-full items-end justify-between">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-heading text-2xl leading-[1.05] font-semibold text-background">
              Olá, {userName}
            </h1>
            <p className="font-heading text-sm leading-[1.15] text-background/70">
              Bora treinar hoje?
            </p>
          </div>
          <div className="rounded-full bg-primary px-4 py-2">
            <span className="font-heading text-sm font-semibold text-primary-foreground">
              Bora!
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Consistência
          </h2>
          <button className="font-heading text-xs text-primary">
            Ver histórico
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl border border-border p-5">
            <ConsistencyTracker
              consistencyByDay={consistencyByDay}
              today={today}
            />
          </div>
          <div className="bg-streak flex items-center gap-2 self-stretch rounded-xl px-5 py-2">
            <Flame className="text-streak-foreground size-5" />
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
            <button className="font-heading text-xs text-primary">
              Ver treinos
            </button>
          </div>

          <Link
            href={`/workout-plans/${todayWorkoutDay.workoutPlanId}/days/${todayWorkoutDay.id}`}
          >
            <WorkoutDayCard
              coverImageUrl={todayWorkoutDay.coverImageUrl}
              estimatedDurationInSeconds={
                todayWorkoutDay.estimatedDurationInSeconds
              }
              exercisesCount={todayWorkoutDay.exercisesCount}
              name={todayWorkoutDay.name}
              weekDay={todayWorkoutDay.weekDay}
            />
          </Link>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
