import { BicepsFlexed, Ruler, User, Weight } from 'lucide-react';
import { redirect } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUser as getProfile } from '@/lib/api/fetch-generated';
import {
  formatAge,
  formatBodyFat,
  formatHeight,
  formatWeight,
} from '@/lib/format';

import { BottomNav } from '../_components/bottom-nav';
import { LogoutButton } from './_components/logout-button';
import { StatCard } from './_components/stat-card';

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
    <div className="flex min-h-svh flex-col bg-background pb-28">
      <header className="flex h-14 items-center px-5">
        <p
          className="text-[22px] leading-[1.15] text-foreground uppercase"
          style={{ fontFamily: 'var(--font-anton)' }}
        >
          Fit.ai
        </p>
      </header>

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
            unit="Kg"
            value={formatWeight(weightInGrams)}
          />
          <StatCard
            icon={Ruler}
            unit="Cm"
            value={formatHeight(heightInCentimeters)}
          />
          <StatCard
            icon={BicepsFlexed}
            unit="Gc"
            value={formatBodyFat(bodyFatPercentage)}
          />
          <StatCard icon={User} unit="Anos" value={formatAge(age)} />
        </div>

        <LogoutButton />
      </div>

      <BottomNav />
    </div>
  );
}
