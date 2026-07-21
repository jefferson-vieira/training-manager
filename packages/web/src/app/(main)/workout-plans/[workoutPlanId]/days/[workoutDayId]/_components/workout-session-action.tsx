'use client';

import { CircleCheckBig } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import type { GetWorkoutDay200Session } from '@/lib/api/fetch-generated';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { startWorkoutSessionAction } from '../actions';

type WorkoutSessionActionsProps = {
  session?: GetWorkoutDay200Session;
  workoutDayId: string;
  workoutPlanId: string;
};

export function WorkoutSessionAction({
  session,
  workoutDayId,
  workoutPlanId,
}: Readonly<WorkoutSessionActionsProps>) {
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    startTransition(async () => {
      const result = await startWorkoutSessionAction({
        workoutDayId,
        workoutPlanId,
      });

      if (result.ok) {
        toast.success('Treino iniciado! Bora treinar 💪');

        return;
      }

      if (result.reason === 'conflict') {
        toast.info('Este treino já havia sido iniciado.');

        return;
      }

      toast.error('Não foi possível iniciar o treino. Tente novamente.');
    });
  }

  if (!session) {
    return (
      <Button
        className="font-heading rounded-full font-semibold"
        disabled={isPending}
        size="xl"
        onClick={handleStart}
      >
        Iniciar treino
      </Button>
    );
  }

  if (session.completedAt) {
    return (
      <Badge className="px-3 py-1.5 text-sm" variant="success">
        <CircleCheckBig className="size-4" />
        Finalizado!
      </Badge>
    );
  }

  return null;
}
