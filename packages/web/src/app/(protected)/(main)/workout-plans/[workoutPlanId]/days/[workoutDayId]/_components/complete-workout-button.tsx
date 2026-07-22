'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { completeWorkoutSessionAction } from '../actions';

type CompleteWorkoutButtonProps = {
  sessionId: string;
  workoutDayId: string;
  workoutPlanId: string;
};

export function CompleteWorkoutButton({
  sessionId,
  workoutDayId,
  workoutPlanId,
}: Readonly<CompleteWorkoutButtonProps>) {
  const [isPending, startTransition] = useTransition();

  function handleComplete() {
    startTransition(async () => {
      const result = await completeWorkoutSessionAction({
        sessionId,
        workoutDayId,
        workoutPlanId,
      });

      if (!result.ok) {
        toast.error('Não foi possível concluir o treino. Tente novamente.');

        return;
      }

      toast.success('Treino concluído! Mandou bem 🎉');
    });
  }

  return (
    <Button
      className="font-heading sticky bottom-24 z-40 min-h-12 w-full rounded-full font-semibold"
      loading={isPending}
      variant="outline"
      onClick={handleComplete}
    >
      Marcar como concluído
    </Button>
  );
}
