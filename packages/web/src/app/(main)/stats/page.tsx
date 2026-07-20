import dayjs from 'dayjs';
import { CircleCheck, CirclePercent, Hourglass } from 'lucide-react';
import { redirect } from 'next/navigation';

import { Header } from '@/components/header';
import { StatCard } from '@/components/stat-card';
import { getApiStats } from '@/lib/api/fetch-generated';
import { formatCompletionRate, formatTotalTime } from '@/lib/format';

import { ConsistencyGrid } from './_components/consistency-grid';
import { StreakBanner } from './_components/streak-banner';

export default async function ProgressPage() {
  const today = dayjs();

  const from = today.subtract(6, 'month').day(0).format('YYYY-MM-DD');

  const to = today.format('YYYY-MM-DD');

  const stats = await getApiStats({ from, to });

  if (stats.status !== 200) {
    redirect('/onboarding');
  }

  const {
    completedWorkoutsCount,
    conclusionRate,
    consistencyByDay,
    totalTimeInSeconds,
    workoutStreak,
  } = stats.data;

  return (
    <>
      <Header />

      <div className="px-5">
        <StreakBanner streak={workoutStreak} />
      </div>

      <div className="flex flex-col gap-3 p-5">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Consistência
        </h2>

        <ConsistencyGrid
          consistencyByDay={consistencyByDay}
          from={from}
          to={to}
        />

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={CircleCheck}
            label="Treinos Feitos"
            value={String(completedWorkoutsCount)}
          />
          <StatCard
            icon={CirclePercent}
            label="Taxa de conclusão"
            value={formatCompletionRate(conclusionRate)}
          />
        </div>

        <StatCard
          icon={Hourglass}
          label="Tempo Total"
          value={formatTotalTime(totalTimeInSeconds)}
        />
      </div>
    </>
  );
}
