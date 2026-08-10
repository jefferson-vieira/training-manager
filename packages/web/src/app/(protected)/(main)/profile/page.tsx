import { BicepsFlexed, Ruler, User, Weight } from 'lucide-react';
import { redirect } from 'next/navigation';

import { Header } from '@/components/header';
import { StatCard } from '@/components/stat-card';
import { getUser as getProfile } from '@/lib/api/fetch-generated';
import {
  formatAge,
  formatBodyFat,
  formatHeight,
  formatWeight,
} from '@/lib/format';

import { AvatarMenu } from './_components/avatar-menu';
import { SignOutButton } from './_components/sign-out-button';

export default async function ProfilePage() {
  const res = await getProfile();

  if (res.status !== 200) {
    redirect('/onboarding');
  }

  const { age, bodyFatPercentage, heightInCentimeters, name, weightInGrams } =
    res.data;

  return (
    <>
      <Header />

      <div className="flex flex-col items-center gap-5 p-5">
        <div className="flex w-full items-center gap-3">
          <AvatarMenu user={res.data} />

          <div className="flex flex-col justify-center gap-1.5">
            <h1 className="font-heading text-lg leading-[1.05] font-semibold text-foreground">
              {name}
            </h1>

            <p className="font-heading text-sm leading-[1.15] text-foreground/70">
              Plano Básico
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          <StatCard
            icon={Weight}
            label="KG"
            value={formatWeight(weightInGrams)}
          />

          <StatCard
            icon={Ruler}
            label="CM"
            value={formatHeight(heightInCentimeters)}
          />

          <StatCard
            icon={BicepsFlexed}
            label="GC"
            value={formatBodyFat(bodyFatPercentage)}
          />

          <StatCard icon={User} label="Anos" value={formatAge(age)} />
        </div>

        <SignOutButton />
      </div>
    </>
  );
}
