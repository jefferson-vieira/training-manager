'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

export function WorkoutDayHeader() {
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

      <h1 className="font-heading mx-auto text-lg font-semibold text-foreground">
        Treino de Hoje
      </h1>
    </header>
  );
}
