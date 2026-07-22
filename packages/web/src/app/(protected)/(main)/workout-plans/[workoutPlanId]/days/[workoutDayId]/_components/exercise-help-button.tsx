'use client';

import { CircleHelp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCoachChat } from '@/hooks/use-coach-chat';

type ExerciseHelpButtonProps = {
  exerciseName: string;
};

export function ExerciseHelpButton({
  exerciseName,
}: Readonly<ExerciseHelpButtonProps>) {
  const { drawerHandle, sendMessage } = useCoachChat();

  const handleClick = () => {
    sendMessage({
      text: `Como executar o exercício ${exerciseName} corretamente?`,
    });

    drawerHandle.open(null);
  };

  return (
    <Button
      aria-label="Ajuda sobre o exercício"
      className="rounded-full text-muted-foreground"
      size="icon-xl"
      variant="ghost"
      onClick={handleClick}
    >
      <CircleHelp className="size-5" />
    </Button>
  );
}
