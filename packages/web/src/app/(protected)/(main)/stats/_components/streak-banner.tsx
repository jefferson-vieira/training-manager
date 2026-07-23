import { Flame } from 'lucide-react';
import Image from 'next/image';

import { cn } from '@/lib/utils';

type StreakBannerProps = {
  streak: number;
};

export function StreakBanner({ streak }: StreakBannerProps) {
  const hasStreak = streak > 0;

  const src = hasStreak
    ? '/progress-streak-banner.png'
    : '/progress-streak-banner-neutral.png';

  return (
    <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-xl px-5 py-10">
      <Image
        alt=""
        className="object-cover"
        fill
        priority
        sizes="100vw"
        src={src}
      />

      <div className="relative flex flex-col items-center gap-3">
        <div className="rounded-full border border-white/15 bg-white/15 p-3 backdrop-blur-xs">
          <Flame
            className={cn(
              'size-8 fill-white text-white',
              hasStreak && 'fill-streak text-streak',
            )}
          />
        </div>

        <div className="flex flex-col items-center gap-1 text-white">
          <span className="font-heading text-5xl leading-[0.95] font-semibold">
            {streak} {streak === 1 ? 'dia' : 'dias'}
          </span>
          <span className="font-heading text-base leading-[1.15] text-white/60">
            Sequência Atual
          </span>
        </div>
      </div>
    </div>
  );
}
