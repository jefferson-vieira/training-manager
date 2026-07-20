import { BicepsFlexed, Ruler, User, Weight } from 'lucide-react';
import { redirect } from 'next/navigation';

import { Header } from '@/components/header';
import { StatCard } from '@/components/stat-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUser as getProfile } from '@/lib/api/fetch-generated';
import {
  formatAge,
  formatBodyFat,
  formatHeight,
  formatWeight,
} from '@/lib/format';

import { LogoutButton } from './_components/logout-button';

export default async function ProfilePage() {
  const res = await getProfile();

  if (res.status !== 200) {
    redirect('/onboarding');
  }

  const {
    age,
    bodyFatPercentage,
    heightInCentimeters,
    image,
    name,
    weightInGrams,
  } = res.data;

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <>
      <Header />

      <div className="flex flex-col items-center gap-5 p-5">
        <div className="flex w-full items-center gap-3">
          <Avatar className="size-[52px]">
            {image && <AvatarImage alt={name} src={image} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
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

        <LogoutButton />
      </div>
    </>
  );
}
