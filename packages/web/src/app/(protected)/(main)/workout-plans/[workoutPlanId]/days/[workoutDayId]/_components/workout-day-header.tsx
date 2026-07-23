'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

type WorkoutDayHeaderProps = {
  title: string;
};

export function WorkoutDayHeader({ title }: Readonly<WorkoutDayHeaderProps>) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 flex items-center gap-2 bg-background p-5">
      <Button
        aria-label="Voltar"
        className="justify-start"
        size="icon"
        variant="ghost"
        onClick={() => router.back()}
      >
        <ChevronLeft className="size-6" />
      </Button>

      <h1 className="mx-auto font-heading text-lg font-semibold text-foreground">
        {title}
      </h1>
    </header>
  );
}
